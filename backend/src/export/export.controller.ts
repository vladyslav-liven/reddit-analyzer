import { Controller, Get, Param, Res } from '@nestjs/common';
import { Response } from 'express';
import { ExportService } from './export.service';

@Controller('sessions/:sessionId/export')
export class ExportController {
  constructor(private readonly exportService: ExportService) {}

  @Get('csv')
  exportCsv(@Param('sessionId') sessionId: string, @Res() res: Response) {
    return this.exportService.exportCsv(sessionId, res);
  }

  @Get('pdf')
  exportPdf(@Param('sessionId') sessionId: string, @Res() res: Response) {
    return this.exportService.exportPdf(sessionId, res);
  }
}
