import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, OneToMany, JoinColumn, Index } from 'typeorm';
import { Session } from './session.entity';
import { RedditComment } from './reddit-comment.entity';

@Entity('reddit_posts')
@Index(['sessionId', 'redditId'], { unique: true })
export class RedditPost {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  sessionId: string;

  @ManyToOne(() => Session, (s) => s.posts, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'sessionId' })
  session: Session;

  @Column()
  redditId: string;

  @Column('text')
  title: string;

  @Column({ default: 0 })
  score: number;

  @Column({ type: 'float', default: 0 })
  upvoteRatio: number;

  @Column({ default: 0 })
  numComments: number;

  @Column('text')
  url: string;

  @Column({ nullable: true })
  author: string;

  @Column()
  subreddit: string;

  @Column({ type: 'text', default: '' })
  selftext: string;

  @Column({ default: false })
  isViral: boolean;

  @Column({ type: 'bigint' })
  createdAtUnix: number;

  @Column({ type: 'timestamptz', default: () => 'NOW()' })
  fetchedAt: Date;

  @OneToMany(() => RedditComment, (c) => c.post, { cascade: true })
  comments: RedditComment[];
}
