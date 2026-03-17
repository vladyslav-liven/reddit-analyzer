import { IsString, IsOptional, IsArray, IsNumber, Min, Max } from 'class-validator';

export class UpdateSessionDto {
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
  @IsString()
  systemPrompt?: string;

  @IsOptional()
  @IsNumber()
  @Min(10)
  @Max(500)
  maxPosts?: number;
}
