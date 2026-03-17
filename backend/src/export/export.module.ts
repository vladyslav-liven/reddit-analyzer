import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Session } from '../database/entities/session.entity';
import { RedditPost } from '../database/entities/reddit-post.entity';
import { RedditComment } from '../database/entities/reddit-comment.entity';
import { AiAnalysis } from '../database/entities/ai-analysis.entity';
import { ExportController } from './export.controller';
import { ExportService } from './export.service';

@Module({
  imports: [TypeOrmModule.forFeature([Session, RedditPost, RedditComment, AiAnalysis])],
  controllers: [ExportController],
  providers: [ExportService],
})
export class ExportModule {}
