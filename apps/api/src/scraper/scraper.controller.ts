import { Body, Controller, Post, Get, HttpCode, HttpStatus } from '@nestjs/common';
import { ScraperService } from './scraper.service';

@Controller('scraper')
export class ScraperController {
  constructor(private readonly scraperService: ScraperService) {}

  @Get('status')
  getStatus() {
    return { ok: true, ...this.scraperService.getStatus() };
  }

  @Post('run')
  @HttpCode(HttpStatus.ACCEPTED)
  run(@Body() body: { profileId?: number } = {}) {
    // Fire and forget — client polls /scraper/status for progress
    this.scraperService.run(body.profileId).catch((err) =>
      console.error('Scraper background error:', err),
    );
    return { ok: true, started: true };
  }

  @Post('stop')
  @HttpCode(HttpStatus.OK)
  stop() {
    this.scraperService.stop();
    return { ok: true };
  }
}
