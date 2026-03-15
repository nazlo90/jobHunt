import { IsString, IsNotEmpty, IsOptional, IsNumber, IsIn, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';
import { JobStatus } from '../../database/entities/job.entity';

const JOB_STATUSES: JobStatus[] = [
  'New', 'Saved', 'Applied', 'Screening', 'Technical', 'Final Round', 'Offer', 'Rejected', 'Archived',
];

export class CreateJobDto {
  @IsString()
  @IsNotEmpty()
  company: string;

  @IsString()
  @IsNotEmpty()
  role: string;

  @IsOptional()
  @IsString()
  salary?: string;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  salaryRaw?: number;

  @IsOptional()
  @IsString()
  url?: string;

  @IsOptional()
  @IsString()
  location?: string;

  @IsOptional()
  @IsString()
  techStack?: string;

  @IsOptional()
  @IsIn(JOB_STATUSES)
  status?: JobStatus;

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(5)
  @Type(() => Number)
  priority?: number;

  @IsOptional()
  @IsString()
  appliedDate?: string;

  @IsOptional()
  @IsString()
  contact?: string;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsString()
  source?: string;
}
