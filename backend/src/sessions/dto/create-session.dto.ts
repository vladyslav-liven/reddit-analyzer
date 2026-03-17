import { IsString, IsNotEmpty, MinLength } from 'class-validator';

export class CreateSessionDto {
  @IsString()
  @IsNotEmpty()
  @MinLength(1)
  name: string;
}
