import { IsString, IsNotEmpty, IsNumber, IsIn } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateDatabaseDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsNotEmpty()
  @IsIn(['postgres', 'mysql', 'redis', 'mongodb'])
  type: string;

  @IsNumber()
  @IsNotEmpty()
  @Type(() => Number)
  projectId: number;
}
