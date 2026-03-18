import { Controller, Post, Get, Param, Body } from '@nestjs/common';
import { IsString } from 'class-validator';
import { AiService } from './ai.service';
import axios from 'axios';

class AnalyzeDto {
  @IsString()
  model: string;
}

@Controller()
export class AiController {
  constructor(private readonly aiService: AiService) {}

  @Get('models')
  getModels() {
    return this.aiService.getModels();
  }

  @Get('debug/ping')
  async debugPing() {
    const results: any = { timestamp: new Date().toISOString() };
    try {
      const res = await axios.get('https://www.reddit.com/r/test.json?limit=1', {
        headers: { 'User-Agent': 'reddit-analyzer/1.0 (nodejs)' },
        timeout: 10000,
      });
      results.reddit = { ok: true, status: res.status, posts: res.data?.data?.children?.length ?? 0 };
    } catch (e) {
      results.reddit = { ok: false, error: e.message, code: e.code };
    }
    return results;
  }

  @Post('sessions/:sessionId/analyze')
  analyze(@Param('sessionId') sessionId: string, @Body() dto: AnalyzeDto) {
    return this.aiService.analyze(sessionId, dto.model);
  }

  @Get('sessions/:sessionId/analyses')
  getAnalyses(@Param('sessionId') sessionId: string) {
    return this.aiService.getAnalyses(sessionId);
  }

  @Get('sessions/:sessionId/analyses/:analysisId')
  getAnalysis(@Param('analysisId') analysisId: string) {
    return this.aiService.getAnalysis(analysisId);
  }
}
