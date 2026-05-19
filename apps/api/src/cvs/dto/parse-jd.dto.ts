import { IsString, IsUrl } from 'class-validator';

export class ParseJdDto {
  @IsString()
  @IsUrl()
  url: string;
}
