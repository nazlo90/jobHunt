import {
  Body, Controller, Delete, Get, Param, ParseIntPipe, Patch, Post,
} from '@nestjs/common';
import { ScraperProfileService } from './scraper-profile.service';
import { CreateScraperProfileDto } from './create-scraper-profile.dto';
import { UpdateScraperProfileDto } from './update-scraper-profile.dto';

@Controller('profiles')
export class ScraperProfileController {
  constructor(private readonly service: ScraperProfileService) {}

  @Get()
  async list() {
    return { ok: true, profiles: await this.service.list() };
  }

  @Get('active')
  async getActive() {
    return { ok: true, profile: await this.service.getActive() };
  }

  @Get(':id')
  async getById(@Param('id', ParseIntPipe) id: number) {
    return { ok: true, profile: await this.service.getById(id) };
  }

  @Post()
  async create(@Body() dto: CreateScraperProfileDto) {
    return { ok: true, profile: await this.service.create(dto) };
  }

  @Patch(':id')
  async update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateScraperProfileDto) {
    return { ok: true, profile: await this.service.update(id, dto) };
  }

  @Post(':id/activate')
  async activate(@Param('id', ParseIntPipe) id: number) {
    return { ok: true, profile: await this.service.activate(id) };
  }

  @Post(':id/duplicate')
  async duplicate(@Param('id', ParseIntPipe) id: number, @Body() body: { name: string }) {
    return { ok: true, profile: await this.service.duplicate(id, body.name) };
  }

  @Delete(':id')
  async delete(@Param('id', ParseIntPipe) id: number) {
    await this.service.delete(id);
    return { ok: true };
  }
}
