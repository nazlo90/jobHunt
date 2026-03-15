import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ScraperConfig } from './scraper-config.entity';
import { ScraperConfigController } from './scraper-config.controller';
import { ScraperConfigService } from './scraper-config.service';

@Module({
  imports: [TypeOrmModule.forFeature([ScraperConfig])],
  controllers: [ScraperConfigController],
  providers: [ScraperConfigService],
  exports: [ScraperConfigService],
})
export class ScraperConfigModule {}
