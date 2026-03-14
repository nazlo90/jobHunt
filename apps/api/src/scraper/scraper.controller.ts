import { Controller, Post, Get, HttpCode, HttpStatus } from '@nestjs/common';
import { ScraperService } from './scraper.service';

@Controller('scraper')
export class ScraperController {
  constructor(private readonly scraperService: ScraperService) {}

  @Get('status')
  getStatus() {
    return { ok: true, ...this.scraperService.getStatus() };
  }

  @Post('run')
  @HttpCode(HttpStatus.OK)
  async run() {
    const run = await this.scraperService.run();
    return { ok: true, run };
  }
}
