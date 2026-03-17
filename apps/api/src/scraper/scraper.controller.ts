import { Body, Controller, Post, Get, HttpCode, HttpStatus } from '@nestjs/common';
import { ScraperService } from './scraper.service';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Public } from '../auth/decorators/public.decorator';
import { User } from '../database/entities/user.entity';

@Controller('scraper')
export class ScraperController {
  constructor(private readonly scraperService: ScraperService) {}

  @Public()
  @Get('status')
  getStatus() {
    return { ok: true, ...this.scraperService.getStatus() };
  }

  @Post('run')
  @HttpCode(HttpStatus.ACCEPTED)
  run(@Body() body: { profileId?: number } = {}, @CurrentUser() user: User) {
    // Fire and forget — client polls /scraper/status for progress
    this.scraperService.run(body.profileId, user.id).catch((err) =>
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
