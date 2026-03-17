import { Controller, Post, Get, Param, Body, Query, Res, Req } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';
import { Response } from 'express';
import { RedditService } from './reddit.service';
import { SessionsService } from '../sessions/sessions.service';
import { ParseConfigDto } from './dto/parse-config.dto';
import { RedditParseProcessor, PARSE_QUEUE } from './reddit-parse.processor';

@Controller('sessions/:sessionId')
export class RedditController {
  constructor(
    private readonly redditService: RedditService,
    private readonly sessionsService: SessionsService,
    @InjectQueue(PARSE_QUEUE) private readonly parseQueue: Queue,
    private readonly parseProcessor: RedditParseProcessor,
  ) {}

  @Post('parse')
  async startParse(@Param('sessionId') sessionId: string, @Body() dto: ParseConfigDto) {
    await this.sessionsService.update(sessionId, {
      keywords: dto.keywords,
      subreddits: dto.subreddits,
      timeRange: dto.timeRange,
      sort: dto.sort,
      topNComments: dto.topNComments,
      maxPosts: dto.maxPosts,
    });
    const job = await this.parseQueue.add('parse', { sessionId });
    return { jobId: job.id, status: 'queued' };
  }

  @Get('parse/status')
  async sseStatus(@Param('sessionId') sessionId: string, @Res() res: Response) {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders();

    const send = (data: object) => res.write(`data: ${JSON.stringify(data)}\n\n`);

    // If already done/failed — respond immediately
    const session = await this.sessionsService.findOne(sessionId);
    if (session?.parseStatus === 'done') {
      send({ type: 'done', pct: 100, posts: 0, comments: 0 });
      res.end();
      return;
    }
    if (session?.parseStatus === 'failed') {
      send({ type: 'error' });
      res.end();
      return;
    }

    this.parseProcessor.setProgressCallback(sessionId, (data) => {
      send(data);
      if (data.type === 'done' || data.type === 'error') {
        this.parseProcessor.removeProgressCallback(sessionId);
        res.end();
      }
    });

    res.on('close', () => {
      this.parseProcessor.removeProgressCallback(sessionId);
    });
  }

  @Get('posts')
  getPosts(
    @Param('sessionId') sessionId: string,
    @Query('page') page = '1',
    @Query('limit') limit = '20',
    @Query('sort') sort = 'score',
    @Query('viral') viral?: string,
  ) {
    return this.redditService.getPosts(sessionId, +page, +limit, sort, viral === 'true');
  }

  @Get('posts/:postId/comments')
  getComments(@Param('postId') postId: string) {
    return this.redditService.getComments(postId);
  }
}
