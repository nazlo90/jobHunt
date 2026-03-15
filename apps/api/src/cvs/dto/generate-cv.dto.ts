import { IsString, IsNotEmpty, IsOptional, IsNumber } from 'class-validator';
import { Type } from 'class-transformer';

export class GenerateCvDto {
  @IsNumber()
  @IsNotEmpty()
  @Type(() => Number)
  userCvId: number;

  @IsString()
  @IsNotEmpty()
  jobDescription: string;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  jobId?: number;

  @IsOptional()
  @IsString()
  company?: string;

  @IsOptional()
  @IsString()
  role?: string;
}
