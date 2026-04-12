import { IsString, IsNotEmpty, IsNumber, MinLength } from 'class-validator';
import { Type } from 'class-transformer';

/**
 * DTO for creating a new project container.
 */
export class CreateProjectDto {
  /** Display name for the project */
  @IsString()
  @IsNotEmpty()
  @MinLength(3)
  name: string;

  /** User ID who owns the project */
  @IsNumber()
  @IsNotEmpty()
  @Type(() => Number)
  userId: number;
}
