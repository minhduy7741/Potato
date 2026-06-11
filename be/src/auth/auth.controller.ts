import { Controller, Post, Get, Patch, Delete, Body, HttpCode, HttpStatus, UseGuards, Request } from '@nestjs/common';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { JwtAuthGuard } from './jwt-auth.guard';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
  ) {}

  /** POST /api/auth/register — Creates a new account and returns a JWT token */
  @Post('register')
  async register(@Body() registerDto: RegisterDto) {
    return this.authService.register(registerDto);
  }

  /** POST /api/auth/login — Validates credentials and returns a JWT token */
  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(@Body() loginDto: LoginDto) {
    return this.authService.login(loginDto);
  }

  /**
   * GET /api/auth/me — Returns the currently authenticated user's profile.
   * Reads the userId from the JWT payload (req.user.id), no body needed.
   */
  @Get('me')
  @UseGuards(JwtAuthGuard)
  async getMe(@Request() req: any) {
    return req.user;
  }

  /**
   * POST /api/auth/change-password — Protected: changes password for current user.
   * userId is read from the JWT token, not from the request body.
   */
  @Post('change-password')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard)
  async changePassword(@Request() req: any, @Body() dto: ChangePasswordDto) {
    return this.authService.changePassword(req.user.id, dto.currentPassword, dto.newPassword);
  }

  /**
   * PATCH /api/auth/me — Protected: updates the display name for current user.
   * userId is read from the JWT token, not from the request body.
   */
  @Patch('me')
  @UseGuards(JwtAuthGuard)
  async updateProfile(@Request() req: any, @Body() dto: UpdateProfileDto) {
    return this.authService.updateProfile(req.user.id, dto.name);
  }

  /**
   * DELETE /api/auth/me — Protected: deletes the current user account and all their projects.
   */
  @Delete('me')
  @UseGuards(JwtAuthGuard)
  async deleteAccount(@Request() req: any) {
    return this.authService.removeAccount(req.user.id);
  }
}
