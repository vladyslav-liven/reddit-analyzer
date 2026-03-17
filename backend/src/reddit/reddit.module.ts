import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BullModule } from '@nestjs/bull';
import { Session } from '../database/entities/session.entity';
import { RedditPost } from '../database/entities/reddit-post.entity';
import { RedditComment } from '../database/entities/reddit-comment.entity';
import { RedditController } from './reddit.controller';
import { RedditService } from './reddit.service';
import { RedditParseProcessor, PARSE_QUEUE } from './reddit-parse.processor';
import { SessionsModule } from '../sessions/sessions.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Session, RedditPost, RedditComment]),
    BullModule.registerQueue({ name: PARSE_QUEUE }),
    SessionsModule,
  ],
  controllers: [RedditController],
  providers: [RedditService, RedditParseProcessor],
  exports: [RedditService],
})
export class RedditModule {}
