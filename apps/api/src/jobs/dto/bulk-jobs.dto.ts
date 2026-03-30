import { IsArray, IsInt, IsString, ArrayNotEmpty } from 'class-validator';

export class BulkDeleteDto {
  @IsArray()
  @ArrayNotEmpty()
  @IsInt({ each: true })
  ids: number[];
}

export class BulkUpdateStatusDto {
  @IsArray()
  @ArrayNotEmpty()
  @IsInt({ each: true })
  ids: number[];

  @IsString()
  status: string;
}
