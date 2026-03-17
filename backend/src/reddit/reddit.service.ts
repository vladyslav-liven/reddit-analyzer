import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import axios from 'axios';
import { Session } from '../database/entities/session.entity';
import { RedditPost } from '../database/entities/reddit-post.entity';
import { RedditComment } from '../database/entities/reddit-comment.entity';

// Reddit public JSON API — no credentials needed, ~10 req/min per IP
const REDDIT_BASE = 'https://www.reddit.com';
const USER_AGENT = 'reddit-analyzer/1.0 (nodejs)';

@Injectable()
export class RedditService {
  private readonly logger = new Logger(RedditService.name);

  constructor(
    @InjectRepository(Session) private readonly sessionRepo: Repository<Session>,
    @InjectRepository(RedditPost) private readonly postRepo: Repository<RedditPost>,
    @InjectRepository(RedditComment) private readonly commentRepo: Repository<RedditComment>,
  ) {}

  private get headers() {
    return { 'User-Agent': USER_AGENT };
  }

  async parseSession(
    sessionId: string,
    onProgress: (data: { pct: number; posts: number; comments: number }) => void,
  ) {
    const session = await this.sessionRepo.findOne({ where: { id: sessionId } });
    if (!session) throw new Error(`Session ${sessionId} not found`);

    await this.sessionRepo.update(sessionId, { parseStatus: 'running' });

    try {
      const keywords = session.keywords || [];
      const timeRange = session.timeRange || 'week';
      const sort = session.sort || 'relevance';
      const topN = session.topNComments || 10;
      const maxPosts = session.maxPosts || 100;
      const maxPages = Math.ceil(maxPosts / 25);
      const hasKeywords = keywords.length > 0;
      const hasSubreddits = session.subreddits?.length > 0;

      if (!hasKeywords && !hasSubreddits) {
        throw new Error('Вкажи хоча б ключові слова або сабредіти');
      }

      const posts: any[] = [];
      let after: string | null = null;
      let pageCount = 0;

      while (pageCount < maxPages) {
        let url: string;

        if (!hasKeywords && hasSubreddits) {
          // Subreddit-only mode: use multireddit hot/top endpoint
          const multi = session.subreddits.join('+');
          const subSort = sort === 'relevance' ? 'hot' : sort;
          url = `${REDDIT_BASE}/r/${multi}/${subSort}.json?t=${timeRange}&limit=25`;
        } else if (hasKeywords && hasSubreddits) {
          // Keywords + subreddits: search within subreddits
          const subFilter = session.subreddits.map(s => `subreddit:${s}`).join(' OR ');
          const q = encodeURIComponent(`${keywords.join(' ')} (${subFilter})`);
          url = `${REDDIT_BASE}/search.json?q=${q}&t=${timeRange}&sort=${sort}&limit=25&type=link`;
        } else {
          // Keywords only: global search
          url = `${REDDIT_BASE}/search.json?q=${encodeURIComponent(keywords.join(' '))}&t=${timeRange}&sort=${sort}&limit=25&type=link`;
        }

        if (after) url += `${url.includes('?') ? '&' : '?'}after=${after}`;

        const res = await axios.get(url, { headers: this.headers });
        const children = res.data?.data?.children || [];
        if (children.length === 0) break;

        posts.push(...children.map((c: any) => c.data));
        after = res.data?.data?.after;
        pageCount++;

        onProgress({ pct: Math.round((pageCount / maxPages) * 30), posts: posts.length, comments: 0 });

        if (!after) break;
        await new Promise(r => setTimeout(r, 2000));
      }

      // Upsert posts
      const savedPosts: RedditPost[] = [];
      for (const p of posts) {
        const isViral = p.score >= 1000 && p.upvote_ratio >= 0.85;
        try {
          const existing = await this.postRepo.findOne({ where: { sessionId, redditId: p.name } });
          if (existing) {
            await this.postRepo.update(existing.id, {
              score: p.score, upvoteRatio: p.upvote_ratio, numComments: p.num_comments, isViral,
            });
            savedPosts.push({ ...existing, score: p.score, isViral } as RedditPost);
          } else {
            const post = this.postRepo.create({
              sessionId, redditId: p.name, title: p.title, score: p.score,
              upvoteRatio: p.upvote_ratio, numComments: p.num_comments,
              url: `https://reddit.com${p.permalink}`, author: p.author,
              subreddit: p.subreddit, selftext: (p.selftext || '').substring(0, 2000),
              isViral, createdAtUnix: p.created_utc,
            });
            const saved = await this.postRepo.save(post);
            savedPosts.push(saved);
          }
        } catch (e) {
          this.logger.warn(`Failed to save post ${p.name}: ${e.message}`);
        }
      }

      onProgress({ pct: 40, posts: savedPosts.length, comments: 0 });

      // Fetch comments for each post
      let commentCount = 0;
      for (let i = 0; i < savedPosts.length; i++) {
        const post = savedPosts[i];
        const p = posts[i];
        try {
          const commentsUrl = `${REDDIT_BASE}/r/${p?.subreddit}/comments/${p?.id}.json?sort=top&limit=${topN}`;
          const commentsRes = await axios.get(commentsUrl, { headers: this.headers });
          const commentData = commentsRes.data?.[1]?.data?.children || [];

          for (const c of commentData) {
            if (c.kind !== 't1' || !c.data?.body) continue;
            try {
              const existing = await this.commentRepo.findOne({ where: { postId: post.id, redditId: c.data.name } });
              if (!existing) {
                const comment = this.commentRepo.create({
                  postId: post.id, redditId: c.data.name,
                  author: c.data.author, body: c.data.body,
                  score: c.data.score || 0, depth: 0,
                  createdAtUnix: c.data.created_utc,
                });
                await this.commentRepo.save(comment);
                commentCount++;
              }
            } catch (e) {
              this.logger.warn(`Failed to save comment: ${e.message}`);
            }
          }
          await new Promise(r => setTimeout(r, 500));
        } catch (e) {
          this.logger.warn(`Failed to fetch comments for post ${post.id}: ${e.message}`);
        }

        const pct = 40 + Math.round(((i + 1) / savedPosts.length) * 55);
        onProgress({ pct, posts: savedPosts.length, comments: commentCount });
      }

      await this.sessionRepo.update(sessionId, { parseStatus: 'done', lastParsedAt: new Date() });
      onProgress({ pct: 100, posts: savedPosts.length, comments: commentCount });
    } catch (error) {
      this.logger.error(`Parse failed for session ${sessionId}: ${error.message}`);
      await this.sessionRepo.update(sessionId, { parseStatus: 'failed' });
      throw error;
    }
  }

  async getPosts(sessionId: string, page = 1, limit = 20, sort = 'score', viralOnly = false) {
    const query = this.postRepo.createQueryBuilder('p')
      .where('p.sessionId = :sessionId', { sessionId });
    if (viralOnly) query.andWhere('p.isViral = true');

    const sortMap: Record<string, string> = {
      score: 'p.score', ratio: 'p.upvoteRatio', comments: 'p.numComments',
    };
    query.orderBy(sortMap[sort] || 'p.score', 'DESC');
    query.skip((page - 1) * limit).take(limit);

    const [items, total] = await query.getManyAndCount();
    return { items, total, page, limit };
  }

  async getComments(postId: string) {
    return this.commentRepo.find({ where: { postId }, order: { score: 'DESC' } });
  }
}
