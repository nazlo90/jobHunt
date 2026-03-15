import { Controller, Post, Get, Body, Query, ParseIntPipe } from '@nestjs/common';
import { CvsService } from './cvs.service';
import { GenerateCvDto } from './dto/generate-cv.dto';

@Controller('cvs')
export class CvsController {
  constructor(private readonly cvsService: CvsService) {}

  @Get()
  async getForJob(@Query('job_id', ParseIntPipe) jobId: number) {
    const cv = await this.cvsService.getLatestForJob(jobId);
    return { ok: true, cv };
  }

  @Post('review')
  async review(@Body() dto: GenerateCvDto) {
    const cv = await this.cvsService.review(dto);
    return { ok: true, cv };
  }

  @Post('adapt')
  async adapt(@Body() body: { adaptedCvId: number }) {
    const result = await this.cvsService.adapt(body.adaptedCvId);
    return { ok: true, adaptedCvText: result.adaptedCvText };
  }
}
