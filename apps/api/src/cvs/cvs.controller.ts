import {
  Controller,
  Post,
  Get,
  Body,
  Query,
  ParseIntPipe,
} from '@nestjs/common';
import { CvsService } from './cvs.service';
import { GenerateCvDto } from './dto/generate-cv.dto';
import { ParseJdDto } from './dto/parse-jd.dto';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { User } from '../database/entities/user.entity';

@Controller('cvs')
export class CvsController {
  constructor(private readonly cvsService: CvsService) {}

  @Get()
  async getForJob(
    @Query('job_id', ParseIntPipe) jobId: number,
    @CurrentUser() user: User,
  ) {
    const cv = await this.cvsService.getLatestForJob(jobId, user.id);
    return { ok: true, cv };
  }

  @Post('review')
  async review(@Body() dto: GenerateCvDto, @CurrentUser() user: User) {
    const cv = await this.cvsService.review(dto, user.id);
    return { ok: true, cv };
  }

  @Post('parse-jd')
  async parseJd(@Body() dto: ParseJdDto) {
    const result = await this.cvsService.parseJobDescription(dto.url);
    return { ok: true, jobDescription: result.jobDescription };
  }

  @Post('cover-letter')
  async coverLetter(
    @Body() dto: GenerateCvDto,
    @CurrentUser() user: User,
  ) {
    const result = await this.cvsService.generateCoverLetter(
      dto.userCvId,
      dto.jobDescription,
      user.id,
      dto.language,
    );
    return { ok: true, coverLetter: result.coverLetter };
  }

  @Post('adapt')
  async adapt(
    @Body() body: { adaptedCvId: number },
    @CurrentUser() user: User,
  ) {
    const result = await this.cvsService.adapt(body.adaptedCvId, user.id);
    return { ok: true, adaptedCvText: result.adaptedCvText };
  }
}
