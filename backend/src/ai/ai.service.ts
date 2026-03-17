import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { Session } from '../database/entities/session.entity';
import { RedditPost } from '../database/entities/reddit-post.entity';
import { RedditComment } from '../database/entities/reddit-comment.entity';
import { AiAnalysis } from '../database/entities/ai-analysis.entity';
import { OpenRouterProvider } from './providers/openrouter.provider';

@Injectable()
export class AiService {
  constructor(
    @InjectRepository(Session) private readonly sessionRepo: Repository<Session>,
    @InjectRepository(RedditPost) private readonly postRepo: Repository<RedditPost>,
    @InjectRepository(RedditComment) private readonly commentRepo: Repository<RedditComment>,
    @InjectRepository(AiAnalysis) private readonly analysisRepo: Repository<AiAnalysis>,
    private readonly config: ConfigService,
  ) {}

  async analyze(sessionId: string, model: string) {
    const apiKey = this.config.get('OPENROUTER_API_KEY');
    if (!apiKey) throw new BadRequestException('OPENROUTER_API_KEY is not set');

    const session = await this.sessionRepo.findOne({ where: { id: sessionId } });
    if (!session) throw new NotFoundException(`Session ${sessionId} not found`);

    const posts = await this.postRepo.find({
      where: { sessionId },
      order: { score: 'DESC' },
      take: 100,
    });
    if (posts.length === 0) {
      throw new BadRequestException('No posts to analyze. Run parsing first.');
    }

    const postsWithComments = await Promise.all(posts.map(async (post) => {
      const comments = await this.commentRepo.find({
        where: { postId: post.id },
        order: { score: 'DESC' },
        take: 10,
      });
      return {
        title: post.title,
        score: post.score,
        upvoteRatio: post.upvoteRatio,
        numComments: post.numComments,
        subreddit: post.subreddit,
        selftext: post.selftext,
        isViral: post.isViral,
        url: post.url,
        comments: comments.map(c => ({ body: c.body, score: c.score })),
      };
    }));

    const provider = new OpenRouterProvider(apiKey, model);
    const { result, tokensUsed, inputTokens, outputTokens, costUsd } = await provider.analyze({
      posts: postsWithComments,
      systemPrompt: session.systemPrompt,
    });

    const analysis = this.analysisRepo.create({
      sessionId,
      provider: 'openrouter',
      model,
      summary: result.summary,
      keyInsights: result.keyInsights,
      commentInsights: result.commentInsights,
      sentiment: result.sentiment,
      painPoints: result.painPoints,
      trendingPhrases: result.trendingPhrases,
      structuredReport: result.structuredReport,
      tokensUsed,
      inputTokens,
      outputTokens,
      costUsd,
    });
    return this.analysisRepo.save(analysis);
  }

  async getModels() {
    return [
      { id: 'anthropic/claude-sonnet-4-5', name: 'Claude Sonnet 4.5', provider: 'Anthropic' },
      { id: 'anthropic/claude-haiku-4-5', name: 'Claude Haiku 4.5 (fast & cheap)', provider: 'Anthropic' },
      { id: 'openai/gpt-4o', name: 'GPT-4o', provider: 'OpenAI' },
      { id: 'openai/gpt-4o-mini', name: 'GPT-4o Mini (fast & cheap)', provider: 'OpenAI' },
      { id: 'google/gemini-pro-1.5', name: 'Gemini Pro 1.5', provider: 'Google' },
      { id: 'google/gemini-flash-1.5', name: 'Gemini Flash 1.5 (fast & cheap)', provider: 'Google' },
      { id: 'meta-llama/llama-3.3-70b-instruct', name: 'Llama 3.3 70B (free)', provider: 'Meta' },
    ];
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
