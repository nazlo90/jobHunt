import {
  Controller, Get, Post, Patch, Delete,
  Param, Body, Query, ParseIntPipe, HttpCode, HttpStatus,
} from '@nestjs/common';
import { JobsService } from './jobs.service';
import { CreateJobDto } from './dto/create-job.dto';
import { UpdateJobDto } from './dto/update-job.dto';
import { QueryJobsDto } from './dto/query-jobs.dto';
import { BulkDeleteDto, BulkUpdateStatusDto } from './dto/bulk-jobs.dto';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { User } from '../database/entities/user.entity';

@Controller('jobs')
export class JobsController {
  constructor(private readonly jobsService: JobsService) {}

  @Get()
  async findAll(@Query() query: QueryJobsDto, @CurrentUser() user: User) {
    const { jobs, total } = await this.jobsService.findAll(query, user.id);
    return { ok: true, jobs, total };
  }

  @Get('stats')
  async getStats(@CurrentUser() user: User) {
    const stats = await this.jobsService.getStats(user.id);
    return { ok: true, stats };
  }

  @Post('autocomplete')
  @HttpCode(HttpStatus.OK)
  async autocomplete(@Body() body: { url: string }) {
    const data = await this.jobsService.autocomplete(body.url);
    return { ok: true, ...data };
  }

  @Delete('bulk')
  @HttpCode(HttpStatus.OK)
  async bulkDelete(@Body() dto: BulkDeleteDto, @CurrentUser() user: User) {
    const result = await this.jobsService.bulkDelete(dto.ids, user.id);
    return { ok: true, ...result };
  }

  @Patch('bulk/status')
  async bulkUpdateStatus(@Body() dto: BulkUpdateStatusDto, @CurrentUser() user: User) {
    const result = await this.jobsService.bulkUpdateStatus(dto.ids, dto.status, user.id);
    return { ok: true, ...result };
  }

  @Get(':id')
  async findOne(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: User) {
    const job = await this.jobsService.findOne(id, user.id);
    return { ok: true, job };
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(@Body() dto: CreateJobDto, @CurrentUser() user: User) {
    const job = await this.jobsService.create(dto, user.id);
    return { ok: true, job };
  }

  @Patch(':id')
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateJobDto,
    @CurrentUser() user: User,
  ) {
    const job = await this.jobsService.update(id, dto, user.id);
    return { ok: true, job };
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  async remove(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: User) {
    await this.jobsService.remove(id, user.id);
    return { ok: true };
  }
}
