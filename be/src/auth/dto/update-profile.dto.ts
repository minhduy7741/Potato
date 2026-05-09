import { IsString, IsOptional } from 'class-validator';

/**
 * userId is NOT accepted here — it is read from the JWT token (req.user.id).
 */
export class UpdateProfileDto {
  @IsString()
  @IsOptional()
  name?: string;
}
