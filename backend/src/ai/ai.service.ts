import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { Session } from '../database/entities/session.entity';
import { RedditPost } from '../database/entities/reddit-post.entity';
import { RedditComment } from '../database/entities/reddit-comment.entity';
import { AiAnalysis } from '../database/entities/ai-analysis.entity';
import { AIProvider } from './ai-provider.interface';
import { ClaudeProvider } from './providers/claude.provider';
import { OpenAIProvider } from './providers/openai.provider';
import { GeminiProvider } from './providers/gemini.provider';

@Injectable()
export class AiService {
  constructor(
    @InjectRepository(Session) private readonly sessionRepo: Repository<Session>,
    @InjectRepository(RedditPost) private readonly postRepo: Repository<RedditPost>,
    @InjectRepository(RedditComment) private readonly commentRepo: Repository<RedditComment>,
    @InjectRepository(AiAnalysis) private readonly analysisRepo: Repository<AiAnalysis>,
    private readonly config: ConfigService,
  ) {}

  private getProvider(providerName: string): AIProvider {
    switch (providerName) {
      case 'claude':
        return new ClaudeProvider(this.config.get('ANTHROPIC_API_KEY') || '');
      case 'openai':
        return new OpenAIProvider(this.config.get('OPENAI_API_KEY') || '');
      case 'gemini':
        return new GeminiProvider(this.config.get('GEMINI_API_KEY') || '');
      default:
        throw new BadRequestException(`Unknown provider: ${providerName}`);
    }
  }

  async analyze(sessionId: string, providerName: string) {
    const session = await this.sessionRepo.findOne({ where: { id: sessionId } });
    if (!session) throw new NotFoundException(`Session ${sessionId} not found`);

    const posts = await this.postRepo.find({ where: { sessionId }, order: { score: 'DESC' }, take: 100 });
    if (posts.length === 0) throw new BadRequestException('No posts to analyze. Run parsing first.');

    const postsWithComments = await Promise.all(posts.map(async (post) => {
      const comments = await this.commentRepo.find({ where: { postId: post.id }, order: { score: 'DESC' }, take: 10 });
      return {
        title: post.title, score: post.score, upvoteRatio: post.upvoteRatio,
        numComments: post.numComments, subreddit: post.subreddit,
        selftext: post.selftext, isViral: post.isViral, url: post.url,
        comments: comments.map(c => ({ body: c.body, score: c.score })),
      };
    }));

    const provider = this.getProvider(providerName);
    const { result, tokensUsed } = await provider.analyze({ posts: postsWithComments, systemPrompt: session.systemPrompt });

    const analysis = this.analysisRepo.create({
      sessionId, provider: providerName, model: provider.model,
      summary: result.summary, keyInsights: result.keyInsights,
      sentiment: result.sentiment, painPoints: result.painPoints,
      trendingPhrases: result.trendingPhrases, structuredReport: result.structuredReport,
      tokensUsed,
    });
    return this.analysisRepo.save(analysis);
  }

  async getAnalyses(sessionId: string) {
    return this.analysisRepo.find({ where: { sessionId }, order: { createdAt: 'DESC' } });
  }

  async getAnalysis(analysisId: string) {
    const analysis = await this.analysisRepo.findOne({ where: { id: analysisId } });
    if (!analysis) throw new NotFoundException(`Analysis ${analysisId} not found`);
    return analysis;
  }
}
