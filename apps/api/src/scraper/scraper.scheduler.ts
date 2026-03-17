import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { ScraperService } from './scraper.service';

@Injectable()
export class ScraperScheduler {
  private readonly logger = new Logger(ScraperScheduler.name);

  constructor(private readonly scraperService: ScraperService) {}

  // Run every day at 8am
  @Cron('0 8 * * *')
  async runDailyScrape() {
    this.logger.log('Daily scrape triggered by scheduler');
    await this.scraperService.runForAllUsers();
  }
}
