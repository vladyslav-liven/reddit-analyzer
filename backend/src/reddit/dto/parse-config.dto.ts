import { IsArray, IsString, IsOptional, IsNumber, Min, Max } from 'class-validator';

export class ParseConfigDto {
  @IsArray()
  keywords: string[];

  @IsOptional()
  @IsArray()
  subreddits?: string[];

  @IsOptional()
  @IsString()
  timeRange?: string;

  @IsOptional()
  @IsString()
  sort?: string;

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(50)
  topNComments?: number;
}
