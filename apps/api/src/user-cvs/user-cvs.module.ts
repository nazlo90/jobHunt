import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UserCv } from '../database/entities/user-cv.entity';
import { UserCvsController } from './user-cvs.controller';
import { UserCvsService } from './user-cvs.service';

@Module({
  imports: [TypeOrmModule.forFeature([UserCv])],
  controllers: [UserCvsController],
  providers: [UserCvsService],
  exports: [UserCvsService],
})
export class UserCvsModule {}
