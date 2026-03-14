import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { DatabaseModule } from './database/database.module';
import { JobsModule } from './jobs/jobs.module';
import { CvsModule } from './cvs/cvs.module';
import { ScraperModule } from './scraper/scraper.module';
import { McpModule } from './mcp/mcp.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ScheduleModule.forRoot(),
    DatabaseModule,
    JobsModule,
    CvsModule,
    ScraperModule,
    McpModule,
  ],
})
export class AppModule {}
