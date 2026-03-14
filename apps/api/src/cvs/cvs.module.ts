import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AdaptedCv } from '../database/entities/adapted-cv.entity';
import { Job } from '../database/entities/job.entity';
import { CvsController } from './cvs.controller';
import { CvsService } from './cvs.service';

@Module({
  imports: [TypeOrmModule.forFeature([AdaptedCv, Job])],
  controllers: [CvsController],
  providers: [CvsService],
})
export class CvsModule {}
