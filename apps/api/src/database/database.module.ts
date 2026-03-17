import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigService } from '@nestjs/config';
import { join } from 'path';
import { Job } from './entities/job.entity';
import { AdaptedCv } from './entities/adapted-cv.entity';
import { UserCv } from './entities/user-cv.entity';
import { User } from './entities/user.entity';
import { RefreshToken } from './entities/refresh-token.entity';
import { ScraperConfig } from '../scraper-config/scraper-config.entity';
import { ScraperProfile } from '../scraper-profile/scraper-profile.entity';

@Module({
  imports: [
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        type: 'better-sqlite3',
        database: config.get<string>('DB_PATH') ?? join(__dirname, '../../../../db/jobhunt.db'),
        entities: [Job, AdaptedCv, UserCv, User, RefreshToken, ScraperConfig, ScraperProfile],
        synchronize: false, // schema managed manually — existing DB
        logging: config.get('NODE_ENV') === 'development',
      }),
    }),
  ],
})
export class DatabaseModule {}
