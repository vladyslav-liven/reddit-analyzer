import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BullModule } from '@nestjs/bull';
import { ServeStaticModule } from '@nestjs/serve-static';
import * as path from 'path';

import { SessionsModule } from './sessions/sessions.module';
import { RedditModule } from './reddit/reddit.module';
import { AiModule } from './ai/ai.module';
import { ExportModule } from './export/export.module';

import { Session } from './database/entities/session.entity';
import { RedditPost } from './database/entities/reddit-post.entity';
import { RedditComment } from './database/entities/reddit-comment.entity';
import { AiAnalysis } from './database/entities/ai-analysis.entity';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        type: 'postgres',
        url: config.get('DATABASE_URL'),
        entities: [Session, RedditPost, RedditComment, AiAnalysis],
        synchronize: true,
        ssl: config.get('NODE_ENV') === 'production' ? { rejectUnauthorized: false } : false,
      }),
    }),
    BullModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        redis: config.get('REDIS_URL') || { host: 'localhost', port: 6379 },
      }),
    }),
    ServeStaticModule.forRoot({
      rootPath: path.join(__dirname, '..', 'public'),
      exclude: ['/api/(.*)'],
      serveStaticOptions: { index: false, fallthrough: true },
      renderPath: '/*',
    }),
    SessionsModule,
    RedditModule,
    AiModule,
    ExportModule,
  ],
})
export class AppModule {}
