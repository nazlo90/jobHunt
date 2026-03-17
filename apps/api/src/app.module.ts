import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { DatabaseModule } from './database/database.module';
import { JobsModule } from './jobs/jobs.module';
import { CvsModule } from './cvs/cvs.module';
import { ScraperModule } from './scraper/scraper.module';
import { McpModule } from './mcp/mcp.module';
import { ScraperConfigModule } from './scraper-config/scraper-config.module';
import { ScraperProfileModule } from './scraper-profile/scraper-profile.module';
import { UserCvsModule } from './user-cvs/user-cvs.module';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { EmailModule } from './email/email.module';
import { JwtAuthGuard } from './auth/guards/jwt-auth.guard';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ScheduleModule.forRoot(),
    ThrottlerModule.forRoot([{ ttl: 60000, limit: 100 }]),
    DatabaseModule,
    AuthModule,
    UsersModule,
    EmailModule,
    JobsModule,
    CvsModule,
    ScraperModule,
    ScraperConfigModule,
    ScraperProfileModule,
    UserCvsModule,
    McpModule,
  ],
  providers: [
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: ThrottlerGuard },
  ],
})
export class AppModule {}
