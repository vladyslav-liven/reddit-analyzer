import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, Index } from 'typeorm';
import { RedditPost } from './reddit-post.entity';

@Entity('reddit_comments')
@Index(['postId', 'redditId'], { unique: true })
export class RedditComment {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  postId: string;

  @ManyToOne(() => RedditPost, (p) => p.comments, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'postId' })
  post: RedditPost;

  @Column()
  redditId: string;

  @Column({ nullable: true })
  author: string;

  @Column('text')
  body: string;

  @Column({ default: 0 })
  score: number;

  @Column({ default: 0 })
  depth: number;

  @Column({ type: 'bigint' })
  createdAtUnix: number;

  @Column({ type: 'timestamptz', default: () => 'NOW()' })
  fetchedAt: Date;
}
