import {
  IsArray, IsBoolean, IsNotEmpty, IsNumber, IsObject, IsOptional, IsString, Min,
} from 'class-validator';

export class CreateScraperProfileDto {
  @IsString() @IsNotEmpty()
  name: string;

  @IsOptional() @IsArray() @IsString({ each: true })
  searchTerms?: string[];

  @IsOptional() @IsNumber() @Min(0)
  minSalary?: number;

  @IsOptional() @IsBoolean()
  remoteOnly?: boolean;

  @IsOptional() @IsArray() @IsString({ each: true })
  strongKeywords?: string[];

  @IsOptional() @IsArray() @IsString({ each: true })
  additionalKeywords?: string[];

  @IsOptional() @IsArray() @IsString({ each: true })
  excludeTitle?: string[];

  @IsOptional() @IsArray() @IsString({ each: true })
  excludeKeywords?: string[];

  @IsOptional() @IsBoolean()
  requireStrongMatch?: boolean;

  @IsOptional() @IsNumber() @Min(0)
  minScore?: number;

  @IsOptional() @IsArray() @IsString({ each: true })
  enabledSources?: string[];

  @IsOptional() @IsObject()
  sourceConfig?: Record<string, any>;
}
