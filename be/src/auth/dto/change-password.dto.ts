import { IsString, IsNotEmpty, MinLength } from 'class-validator';

/**
 * userId is NOT accepted here — it is read from the JWT token (req.user.id).
 */
export class ChangePasswordDto {
  @IsString()
  @IsNotEmpty()
  currentPassword: string;

  @IsString()
  @IsNotEmpty()
  @MinLength(6)
  newPassword: string;
}
