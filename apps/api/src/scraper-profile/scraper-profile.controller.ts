import {
  Body, Controller, Delete, Get, Param, ParseIntPipe, Patch, Post, HttpCode,
} from '@nestjs/common';
import { ScraperProfileService } from './scraper-profile.service';
import { CreateScraperProfileDto } from './create-scraper-profile.dto';
import { UpdateScraperProfileDto } from './update-scraper-profile.dto';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { User } from '../database/entities/user.entity';

@Controller('profiles')
export class ScraperProfileController {
  constructor(private readonly service: ScraperProfileService) {}

  @Get()
  async list(@CurrentUser() user: User) {
    return { ok: true, profiles: await this.service.list(user.id) };
  }

  @Get('active')
  async getActive(@CurrentUser() user: User) {
    return { ok: true, profile: await this.service.getActive(user.id) };
  }

  @Get(':id')
  async getById(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: User) {
    return { ok: true, profile: await this.service.getById(id, user.id) };
  }

  @Post('extract-from-cv')
  @HttpCode(200)
  async extractFromCv(@Body() body: { cvText: string }, @CurrentUser() user: User) {
    const result = await this.service.extractFromCv(body.cvText, user.id);
    return { ok: true, ...result };
  }

  @Post()
  async create(@Body() dto: CreateScraperProfileDto, @CurrentUser() user: User) {
    return { ok: true, profile: await this.service.create(dto, user.id) };
  }

  @Patch(':id')
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateScraperProfileDto,
    @CurrentUser() user: User,
  ) {
    return { ok: true, profile: await this.service.update(id, dto, user.id) };
  }

  @Post(':id/activate')
  async activate(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: User) {
    return { ok: true, profile: await this.service.activate(id, user.id) };
  }

  @Post(':id/duplicate')
  async duplicate(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: { name: string },
    @CurrentUser() user: User,
  ) {
    return { ok: true, profile: await this.service.duplicate(id, body.name, user.id) };
  }

  @Delete(':id')
  async delete(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: User) {
    await this.service.delete(id, user.id);
    return { ok: true };
  }
}
