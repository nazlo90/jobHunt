import { Controller, Post, Body } from '@nestjs/common';
import { CvsService } from './cvs.service';
import { GenerateCvDto } from './dto/generate-cv.dto';

@Controller('cvs')
export class CvsController {
  constructor(private readonly cvsService: CvsService) {}

  @Post('generate')
  async generate(@Body() dto: GenerateCvDto) {
    const cv = await this.cvsService.generate(dto);
    return { ok: true, cv };
  }
}
