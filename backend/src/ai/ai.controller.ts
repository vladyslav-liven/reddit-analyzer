import { Controller, Post, Get, Param, Body } from '@nestjs/common';
import { AiService } from './ai.service';
import { IsString } from 'class-validator';

class AnalyzeDto {
  @IsString()
  provider: string;
}

@Controller('sessions/:sessionId')
export class AiController {
  constructor(private readonly aiService: AiService) {}

  @Post('analyze')
  analyze(@Param('sessionId') sessionId: string, @Body() dto: AnalyzeDto) {
    return this.aiService.analyze(sessionId, dto.provider);
  }

  @Get('analyses')
  getAnalyses(@Param('sessionId') sessionId: string) {
    return this.aiService.getAnalyses(sessionId);
  }

  @Get('analyses/:analysisId')
  getAnalysis(@Param('analysisId') analysisId: string) {
    return this.aiService.getAnalysis(analysisId);
  }
}
