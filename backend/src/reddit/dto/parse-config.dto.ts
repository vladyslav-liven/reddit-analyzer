import { IsArray, IsString, IsOptional, IsNumber, Min, Max } from 'class-validator';

export class ParseConfigDto {
  @IsOptional()
  @IsArray()
  keywords?: string[];

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

  @IsOptional()
  @IsNumber()
  @Min(10)
  @Max(500)
  maxPosts?: number;
}
