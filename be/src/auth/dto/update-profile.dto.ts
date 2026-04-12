import { IsString, IsNotEmpty, IsNumber, IsOptional } from 'class-validator';

export class UpdateProfileDto {
  @IsNumber()
  @IsNotEmpty()
  userId: number;

  @IsString()
  @IsOptional()
  name?: string;
}
