import { Controller, Post, Get, Param, Body } from '@nestjs/common';
import { IsString } from 'class-validator';
import { AiService } from './ai.service';

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
