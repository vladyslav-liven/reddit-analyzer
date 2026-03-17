import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, OneToMany } from 'typeorm';
import { RedditPost } from './reddit-post.entity';
import { AiAnalysis } from './ai-analysis.entity';

export enum ParseStatus {
  IDLE = 'idle',
  RUNNING = 'running',
  DONE = 'done',
  FAILED = 'failed',
}

@Entity('sessions')
export class Session {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  name: string;

  @Column('text', { array: true, default: '{}' })
  keywords: string[];

  @Column('text', { array: true, default: '{}' })
  subreddits: string[];

  @Column({ default: 'week' })
  timeRange: string;

  @Column({ default: 'relevance' })
  sort: string;

  @Column({ default: 10 })
  topNComments: number;

  @Column({ default: 100 })
  maxPosts: number;

  @Column({ type: 'text', default: '' })
  systemPrompt: string;

  @Column({ default: ParseStatus.IDLE })
  parseStatus: string;

  @Column({ type: 'timestamptz', nullable: true })
  lastParsedAt: Date;

  @OneToMany(() => RedditPost, (post) => post.session, { cascade: true })
  posts: RedditPost[];

  @OneToMany(() => AiAnalysis, (analysis) => analysis.session, { cascade: true })
  analyses: AiAnalysis[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
