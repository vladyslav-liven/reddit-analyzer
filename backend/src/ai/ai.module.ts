import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Session } from '../database/entities/session.entity';
import { RedditPost } from '../database/entities/reddit-post.entity';
import { RedditComment } from '../database/entities/reddit-comment.entity';
import { AiAnalysis } from '../database/entities/ai-analysis.entity';
import { AiController } from './ai.controller';
import { AiService } from './ai.service';

@Module({
  imports: [TypeOrmModule.forFeature([Session, RedditPost, RedditComment, AiAnalysis])],
  controllers: [AiController],
  providers: [AiService],
  exports: [AiService],
})
export class AiModule {}
