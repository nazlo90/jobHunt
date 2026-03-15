import {
  Controller, Get, Post, Patch, Delete,
  Param, Body, Query, ParseIntPipe, HttpCode, HttpStatus,
} from '@nestjs/common';
import { JobsService } from './jobs.service';
import { CreateJobDto } from './dto/create-job.dto';
import { UpdateJobDto } from './dto/update-job.dto';
import { QueryJobsDto } from './dto/query-jobs.dto';

@Controller('jobs')
export class JobsController {
  constructor(private readonly jobsService: JobsService) {}

  @Get()
  async findAll(@Query() query: QueryJobsDto) {
    const { jobs, total } = await this.jobsService.findAll(query);
    return { ok: true, jobs, total };
  }

  @Get('stats')
  async getStats() {
    const stats = await this.jobsService.getStats();
    return { ok: true, stats };
  }

  @Post('autocomplete')
  @HttpCode(HttpStatus.OK)
  async autocomplete(@Body() body: { url: string }) {
    const data = await this.jobsService.autocomplete(body.url);
    return { ok: true, ...data };
  }

  @Get(':id')
  async findOne(@Param('id', ParseIntPipe) id: number) {
    const job = await this.jobsService.findOne(id);
    return { ok: true, job };
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(@Body() dto: CreateJobDto) {
    const job = await this.jobsService.create(dto);
    return { ok: true, job };
  }

  @Patch(':id')
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateJobDto,
  ) {
    const job = await this.jobsService.update(id, dto);
    return { ok: true, job };
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  async remove(@Param('id', ParseIntPipe) id: number) {
    await this.jobsService.remove(id);
    return { ok: true };
  }
}
