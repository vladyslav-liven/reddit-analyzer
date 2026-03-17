import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, CreateDateColumn } from 'typeorm';
import { Session } from './session.entity';

@Entity('ai_analyses')
export class AiAnalysis {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  sessionId: string;

  @ManyToOne(() => Session, (s) => s.analyses, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'sessionId' })
  session: Session;

  @Column()
  provider: string;

  @Column()
  model: string;

  @Column({ type: 'text', default: '' })
  summary: string;

  @Column({ type: 'jsonb', default: '[]' })
  keyInsights: any[];

  @Column({ type: 'jsonb', default: '{}' })
  sentiment: object;

  @Column({ type: 'jsonb', default: '[]' })
  painPoints: string[];

  @Column({ type: 'jsonb', default: '[]' })
  trendingPhrases: string[];

  @Column({ type: 'text', default: '' })
  structuredReport: string;

  @Column({ nullable: true })
  tokensUsed: number;

  @Column({ nullable: true })
  inputTokens: number;

  @Column({ nullable: true })
  outputTokens: number;

  @Column({ type: 'decimal', precision: 10, scale: 6, nullable: true })
  costUsd: number;

  @CreateDateColumn()
  createdAt: Date;
}
