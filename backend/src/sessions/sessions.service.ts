import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Session } from '../database/entities/session.entity';
import { RedditPost } from '../database/entities/reddit-post.entity';
import { AiAnalysis } from '../database/entities/ai-analysis.entity';
import { CreateSessionDto } from './dto/create-session.dto';
import { UpdateSessionDto } from './dto/update-session.dto';

@Injectable()
export class SessionsService {
  constructor(
    @InjectRepository(Session) private readonly sessionRepo: Repository<Session>,
    @InjectRepository(RedditPost) private readonly postRepo: Repository<RedditPost>,
    @InjectRepository(AiAnalysis) private readonly analysisRepo: Repository<AiAnalysis>,
  ) {}

  async findAll() {
    const sessions = await this.sessionRepo.find({ order: { updatedAt: 'DESC' } });
    const result = await Promise.all(sessions.map(async (s) => {
      const postCount = await this.postRepo.count({ where: { sessionId: s.id } });
      const analysisCount = await this.analysisRepo.count({ where: { sessionId: s.id } });
      return { ...s, postCount, analysisCount };
    }));
    return result;
  }

  async findOne(id: string) {
    const session = await this.sessionRepo.findOne({ where: { id } });
    if (!session) throw new NotFoundException(`Session ${id} not found`);
    const postCount = await this.postRepo.count({ where: { sessionId: id } });
    const analysisCount = await this.analysisRepo.count({ where: { sessionId: id } });
    return { ...session, postCount, analysisCount };
  }

  async create(dto: CreateSessionDto) {
    const existing = await this.sessionRepo.findOne({ where: { name: dto.name } });
    if (existing) throw new ConflictException(`Session "${dto.name}" already exists`);
    const session = this.sessionRepo.create({ name: dto.name });
    return this.sessionRepo.save(session);
  }

  async update(id: string, dto: UpdateSessionDto) {
    const session = await this.sessionRepo.findOne({ where: { id } });
    if (!session) throw new NotFoundException(`Session ${id} not found`);
    Object.assign(session, dto);
    return this.sessionRepo.save(session);
  }

  async remove(id: string) {
    const session = await this.sessionRepo.findOne({ where: { id } });
    if (!session) throw new NotFoundException(`Session ${id} not found`);
    await this.sessionRepo.remove(session);
    return { deleted: true };
  }
}
