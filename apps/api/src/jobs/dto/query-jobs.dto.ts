import { IsOptional, IsString, IsIn } from 'class-validator';

const SORT_OPTIONS = ['created_at', 'priority', 'company', 'applied_date', 'salary'] as const;
type SortOption = typeof SORT_OPTIONS[number];

export class QueryJobsDto {
  @IsOptional()
  @IsString()
  status?: string;

  @IsOptional()
  @IsString()
  source?: string;

  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsIn(SORT_OPTIONS)
  sortBy?: SortOption;
}
