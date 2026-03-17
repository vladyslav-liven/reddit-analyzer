import { Controller, Get, Post, Patch, Delete, Body, Param } from '@nestjs/common';
import { SessionsService } from './sessions.service';
import { CreateSessionDto } from './dto/create-session.dto';
import { UpdateSessionDto } from './dto/update-session.dto';

@Controller('sessions')
export class SessionsController {
  constructor(private readonly sessionsService: SessionsService) {}

  @Get()
  findAll() { return this.sessionsService.findAll(); }

  @Get(':id')
  findOne(@Param('id') id: string) { return this.sessionsService.findOne(id); }

  @Post()
  create(@Body() dto: CreateSessionDto) { return this.sessionsService.create(dto); }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateSessionDto) {
    return this.sessionsService.update(id, dto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) { return this.sessionsService.remove(id); }
}
