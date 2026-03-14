import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Job } from '../database/entities/job.entity';
import { ScraperController } from './scraper.controller';
import { ScraperService } from './scraper.service';
import { ScraperScheduler } from './scraper.scheduler';

@Module({
  imports: [TypeOrmModule.forFeature([Job])],
  controllers: [ScraperController],
  providers: [ScraperService, ScraperScheduler],
  exports: [ScraperService],
})
export class ScraperModule {}
