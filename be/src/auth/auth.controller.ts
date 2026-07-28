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

  /** POST /api/auth/register — Tạo tài khoản người dùng mới (Nhân viên mới) */
  @Post('register')
  async register(@Body() registerDto: RegisterDto) {
    return this.authService.register(registerDto);
  }

  /** POST /api/auth/login — Đăng nhập hệ thống, trả về Token (JWT) */
  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(@Body() loginDto: LoginDto) {
    return this.authService.login(loginDto);
  }

  /**
   * GET /api/auth/me — Lấy thông tin hồ sơ của tài khoản đang đăng nhập hiện tại.
   * Lấy ID người dùng từ bên trong cục Token (req.user.id) nên siêu bảo mật.
   */
  @Get('me')
  @UseGuards(JwtAuthGuard)
  async getMe(@Request() req: any) {
    return this.authService.getProfile(req.user.id);
  }

  /**
   * POST /api/auth/change-password — (Bảo vệ) Đổi mật khẩu cho người dùng hiện tại.
   * Tương tự, ID người dùng lấy từ Token chứ không lấy từ Request Body để tránh bị hack.
   */
  @Post('change-password')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard)
  async changePassword(@Request() req: any, @Body() dto: ChangePasswordDto) {
    return this.authService.changePassword(req.user.id, dto.currentPassword, dto.newPassword);
  }

  /**
   * PATCH /api/auth/me — (Bảo vệ) Cập nhật Tên hiển thị (Tên cá nhân) cho người dùng hiện tại.
   * Vẫn tuân thủ nguyên tắc lấy ID từ Token.
   */
  @Patch('me')
  @UseGuards(JwtAuthGuard)
  async updateProfile(@Request() req: any, @Body() dto: UpdateProfileDto) {
    return this.authService.updateProfile(req.user.id, dto.name);
  }

  /**
   * DELETE /api/auth/me — (Bảo vệ) Xóa tài khoản hiện tại và Bóp cò xóa luôn toàn bộ dự án của họ.
   */
  @Delete('me')
  @UseGuards(JwtAuthGuard)
  async deleteAccount(@Request() req: any) {
    return this.authService.removeAccount(req.user.id);
  }
}
