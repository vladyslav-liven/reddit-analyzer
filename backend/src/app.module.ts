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
      useFactory: (config: ConfigService) => {
        const redisUrl = config.get<string>('REDIS_URL');
        if (!redisUrl) return { redis: { host: 'localhost', port: 6379 } };
        try {
          const url = new URL(redisUrl);
          return {
            redis: {
              host: url.hostname,
              port: parseInt(url.port, 10) || 6379,
              password: url.password ? decodeURIComponent(url.password) : undefined,
              tls: url.protocol === 'rediss:' ? {} : undefined,
            },
          };
        } catch {
          return { redis: { host: 'localhost', port: 6379 } };
        }
      },
    }),
    ServeStaticModule.forRoot({
      rootPath: path.join(__dirname, '..', 'public'),
    }),
    SessionsModule,
    RedditModule,
    AiModule,
    ExportModule,
  ],
})
export class AppModule {}
