import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import { Session } from '../database/entities/session.entity';
import { RedditPost } from '../database/entities/reddit-post.entity';
import { RedditComment } from '../database/entities/reddit-comment.entity';

@Injectable()
export class RedditService {
  private readonly logger = new Logger(RedditService.name);
  private accessToken: string | null = null;
  private tokenExpiry: number = 0;

  constructor(
    @InjectRepository(Session) private readonly sessionRepo: Repository<Session>,
    @InjectRepository(RedditPost) private readonly postRepo: Repository<RedditPost>,
    @InjectRepository(RedditComment) private readonly commentRepo: Repository<RedditComment>,
    private readonly config: ConfigService,
  ) {}

  private async getAccessToken(): Promise<string> {
    if (this.accessToken && Date.now() < this.tokenExpiry) return this.accessToken;

    const clientId = this.config.get('REDDIT_CLIENT_ID');
    const clientSecret = this.config.get('REDDIT_CLIENT_SECRET');
    const username = this.config.get('REDDIT_USERNAME');
    const password = this.config.get('REDDIT_PASSWORD');
    const userAgent = this.config.get('REDDIT_USER_AGENT') || 'reddit-analyzer/1.0';

    const response = await axios.post(
      'https://www.reddit.com/api/v1/access_token',
      `grant_type=password&username=${encodeURIComponent(username)}&password=${encodeURIComponent(password)}`,
      {
        auth: { username: clientId, password: clientSecret },
        headers: { 'User-Agent': userAgent, 'Content-Type': 'application/x-www-form-urlencoded' },
      },
    );

    this.accessToken = response.data.access_token;
    this.tokenExpiry = Date.now() + response.data.expires_in * 1000 - 60000;
    return this.accessToken;
  }

  async parseSession(
    sessionId: string,
    onProgress: (data: { pct: number; posts: number; comments: number }) => void,
  ) {
    const session = await this.sessionRepo.findOne({ where: { id: sessionId } });
    if (!session) throw new Error(`Session ${sessionId} not found`);

    await this.sessionRepo.update(sessionId, { parseStatus: 'running' });

    try {
      const token = await this.getAccessToken();
      const userAgent = this.config.get('REDDIT_USER_AGENT') || 'reddit-analyzer/1.0';

      const headers = { Authorization: `Bearer ${token}`, 'User-Agent': userAgent };
      const query = session.keywords.join(' ');
      const timeRange = session.timeRange || 'week';
      const sort = session.sort || 'relevance';
      const topN = session.topNComments || 10;

      const posts: any[] = [];
      let after: string | null = null;
      let pageCount = 0;
      const maxPages = 3;

      while (pageCount < maxPages) {
        let url = `https://oauth.reddit.com/search?q=${encodeURIComponent(query)}&t=${timeRange}&sort=${sort}&limit=25&type=link`;
        if (session.subreddits?.length > 0) {
          url += `&restrict_sr=false`;
          // search within specific subreddits by appending to query
        }
        if (after) url += `&after=${after}`;

        const res = await axios.get(url, { headers });
        const children = res.data?.data?.children || [];
        if (children.length === 0) break;

        posts.push(...children.map((c: any) => c.data));
        after = res.data?.data?.after;
        pageCount++;

        onProgress({ pct: Math.round((pageCount / maxPages) * 30), posts: posts.length, comments: 0 });

        if (!after) break;
        await new Promise(r => setTimeout(r, 1000)); // respect rate limit
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
          const commentsUrl = `https://oauth.reddit.com/r/${p?.subreddit}/comments/${p?.id}?sort=top&limit=${topN}`;
          const commentsRes = await axios.get(commentsUrl, { headers });
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
