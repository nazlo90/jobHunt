import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Job } from '../database/entities/job.entity';
import { UserCv } from '../database/entities/user-cv.entity';
import { AdaptedCv } from '../database/entities/adapted-cv.entity';
import { CvsController } from './cvs.controller';
import { CvsService } from './cvs.service';

@Module({
  imports: [TypeOrmModule.forFeature([Job, UserCv, AdaptedCv])],
  controllers: [CvsController],
  providers: [CvsService],
})
export class CvsModule {}
