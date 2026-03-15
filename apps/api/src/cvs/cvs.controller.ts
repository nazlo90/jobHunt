import { Controller, Get, Post, Put, Body, Query } from '@nestjs/common';
import { CvsService } from './cvs.service';
import { GenerateCvDto } from './dto/generate-cv.dto';

@Controller('cvs')
export class CvsController {
  constructor(private readonly cvsService: CvsService) {}

  @Get()
  async findAll(@Query('job_id') jobId?: string) {
    const cvs = jobId
      ? await this.cvsService.findForJob(Number(jobId))
      : await this.cvsService.findRecent();
    return { ok: true, cvs };
  }

  @Get('master-cv')
  async getMasterCv() {
    const masterCv = await this.cvsService.getMasterCv();
    return { ok: true, masterCv };
  }

  @Put('master-cv')
  async updateMasterCv(@Body() body: object) {
    await this.cvsService.saveMasterCv(body);
    return { ok: true };
  }

  @Post('generate')
  async generate(@Body() dto: GenerateCvDto) {
    const cv = await this.cvsService.generate(dto);
    return { ok: true, cv };
  }
}
