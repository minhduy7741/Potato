import { IsString, IsNotEmpty, MinLength } from 'class-validator';

/**
 * DTO for creating a new project container.
 * Note: userId is NOT accepted here — it is read from the JWT token on the server.
 */
export class CreateProjectDto {
  /** Display name for the project */
  @IsString()
  @IsNotEmpty()
  @MinLength(3)
  name: string;
}
