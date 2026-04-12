import { Controller, Post, Patch, Body, HttpCode, HttpStatus } from '@nestjs/common';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  async register(@Body() registerDto: RegisterDto) {
    return this.authService.register(registerDto);
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(@Body() loginDto: LoginDto) {
    return this.authService.login(loginDto);
  }

  /**
   * POST /api/auth/change-password
   * Changes the current user's password after verifying the old one.
   */
  @Post('change-password')
  @HttpCode(HttpStatus.OK)
  async changePassword(@Body() dto: ChangePasswordDto) {
    return this.authService.changePassword(dto.userId, dto.currentPassword, dto.newPassword);
  }

  /**
   * PATCH /api/auth/me
   * Updates the current user's display name.
   */
  @Patch('me')
  async updateProfile(@Body() dto: UpdateProfileDto) {
    return this.authService.updateProfile(dto.userId, dto.name);
  }
}
