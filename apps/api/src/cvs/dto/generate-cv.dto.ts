import { IsString, IsNotEmpty, IsOptional, IsNumber, IsObject } from 'class-validator';
import { Type } from 'class-transformer';

export class GenerateCvDto {
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  jobId?: number;

  @IsString()
  @IsNotEmpty()
  jobDescription: string;

  @IsOptional()
  @IsString()
  company?: string;

  @IsOptional()
  @IsString()
  role?: string;

  @IsOptional()
  @IsObject()
  masterCv?: object;

  @IsOptional()
  @IsString()
  cvText?: string;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  userCvId?: number;
}
