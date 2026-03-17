import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Response } from 'express';
import { RedditPost } from '../database/entities/reddit-post.entity';
import { RedditComment } from '../database/entities/reddit-comment.entity';
import { AiAnalysis } from '../database/entities/ai-analysis.entity';
import { Session } from '../database/entities/session.entity';

@Injectable()
export class ExportService {
  constructor(
    @InjectRepository(Session) private readonly sessionRepo: Repository<Session>,
    @InjectRepository(RedditPost) private readonly postRepo: Repository<RedditPost>,
    @InjectRepository(RedditComment) private readonly commentRepo: Repository<RedditComment>,
    @InjectRepository(AiAnalysis) private readonly analysisRepo: Repository<AiAnalysis>,
  ) {}

  async exportCsv(sessionId: string, res: Response) {
    const posts = await this.postRepo.find({ where: { sessionId }, order: { score: 'DESC' } });

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="reddit-analysis-${sessionId}.csv"`);

    res.write('Title,Subreddit,Score,UpvoteRatio,NumComments,IsViral,URL,Author,Date\n');
    for (const post of posts) {
      const date = new Date(Number(post.createdAtUnix) * 1000).toISOString();
      const row = [post.title, post.subreddit, post.score, post.upvoteRatio, post.numComments, post.isViral, post.url, post.author || '', date]
        .map(v => `"${String(v).replace(/"/g, '""')}"`)
        .join(',');
      res.write(row + '\n');
    }
    res.end();
  }

  async exportPdf(sessionId: string, res: Response) {
    const session = await this.sessionRepo.findOne({ where: { id: sessionId } });
    if (!session) throw new NotFoundException('Session not found');

    const analysis = await this.analysisRepo.findOne({ where: { sessionId }, order: { createdAt: 'DESC' } });
    const PDFDocument = require('pdfkit');
    const doc = new PDFDocument({ margin: 50 });

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="reddit-analysis-${sessionId}.pdf"`);
    doc.pipe(res);

    doc.fontSize(20).text(`Reddit Analysis: ${session.name}`, { align: 'center' });
    doc.moveDown();
    doc.fontSize(10).text(`Generated: ${new Date().toISOString()}`);
    doc.moveDown(2);

    if (analysis) {
      doc.fontSize(14).text('Summary', { underline: true });
      doc.moveDown(0.5);
      doc.fontSize(10).text(analysis.summary);
      doc.moveDown();

      doc.fontSize(14).text('Key Insights', { underline: true });
      doc.moveDown(0.5);
      (analysis.keyInsights as string[]).forEach((insight) => {
        doc.fontSize(10).text(`• ${insight}`);
      });
      doc.moveDown();

      doc.fontSize(14).text('Pain Points', { underline: true });
      doc.moveDown(0.5);
      (analysis.painPoints as string[]).forEach((point) => {
        doc.fontSize(10).text(`• ${point}`);
      });
      doc.moveDown();

      doc.fontSize(14).text('Trending Phrases', { underline: true });
      doc.moveDown(0.5);
      doc.fontSize(10).text((analysis.trendingPhrases as string[]).join(', '));
    } else {
      doc.fontSize(12).text('No analysis available for this session.');
    }

    doc.end();
  }
}
