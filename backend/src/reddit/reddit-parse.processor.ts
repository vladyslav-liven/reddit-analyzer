import { Process, Processor } from '@nestjs/bull';
import { Logger } from '@nestjs/common';
import { Job } from 'bull';
import { RedditService } from './reddit.service';

export const PARSE_QUEUE = 'reddit-parse';

@Processor(PARSE_QUEUE)
export class RedditParseProcessor {
  private readonly logger = new Logger(RedditParseProcessor.name);
  private progressMap = new Map<string, any>();

  constructor(private readonly redditService: RedditService) {}

  setProgressCallback(sessionId: string, cb: (data: any) => void) {
    this.progressMap.set(sessionId, cb);
  }

  removeProgressCallback(sessionId: string) {
    this.progressMap.delete(sessionId);
  }

  @Process('parse')
  async handleParse(job: Job<{ sessionId: string }>) {
    const { sessionId } = job.data;
    this.logger.log(`Starting parse for session ${sessionId}`);

    const cb = this.progressMap.get(sessionId);
    await this.redditService.parseSession(sessionId, (progress) => {
      job.progress(progress.pct);
      if (cb) cb({ type: 'progress', ...progress });
    });
    if (cb) cb({ type: 'done', message: 'Готово!' });
  }
}
