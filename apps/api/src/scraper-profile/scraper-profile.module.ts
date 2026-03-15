import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ScraperProfile } from './scraper-profile.entity';
import { ScraperProfileController } from './scraper-profile.controller';
import { ScraperProfileService } from './scraper-profile.service';

@Module({
  imports: [TypeOrmModule.forFeature([ScraperProfile])],
  controllers: [ScraperProfileController],
  providers: [ScraperProfileService],
  exports: [ScraperProfileService],
})
export class ScraperProfileModule {}
