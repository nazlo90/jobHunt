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
  @HttpCode(HttpStatus.ACCEPTED)
  run() {
    // Fire and forget — client polls /scraper/status for progress
    this.scraperService.run().catch((err) =>
      console.error('Scraper background error:', err),
    );
    return { ok: true, started: true };
  }
}
