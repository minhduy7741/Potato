import { Injectable, ConflictException, UnauthorizedException, BadRequestException, NotFoundException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import * as bcrypt from 'bcrypt';
import { Role } from '@prisma/client';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
  ) {}

  // ─── Helpers ─────────────────────────────────────────────────────────

  private signToken(user: { id: number; email: string; name: string | null; role: string }) {
    return this.jwtService.sign({
      sub: user.id,
      email: user.email,
      name: user.name || '',
      role: user.role,
    });
  }

  // ─── Register ────────────────────────────────────────────────────────

  async register(registerDto: RegisterDto) {
    const { email, password, name } = registerDto;

    const existingUser = await this.prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      throw new ConflictException('Email đã tồn tại trên hệ thống');
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await this.prisma.user.create({
      data: { email, password: hashedPassword, name, role: Role.USER },
    });

    const { password: _, ...userWithoutPassword } = user;
    const accessToken = this.signToken(user);

    return {
      user: userWithoutPassword,
      accessToken,
      message: 'Đăng ký thành công',
    };
  }

  // ─── Login ────────────────────────────────────────────────────────────

  async login(loginDto: LoginDto) {
    const { email, password } = loginDto;

    const user = await this.prisma.user.findUnique({ where: { email } });
    if (!user) {
      throw new UnauthorizedException('Thông tin đăng nhập không chính xác');
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Thông tin đăng nhập không chính xác');
    }

    const { password: _, ...userWithoutPassword } = user;
    const accessToken = this.signToken(user);

    return {
      user: userWithoutPassword,
      accessToken,
      message: 'Đăng nhập thành công',
    };
  }

  // ─── Profile Management ───────────────────────────────────────────────

  async changePassword(userId: number, currentPassword: string, newPassword: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('Người dùng không tồn tại');

    const isValid = await bcrypt.compare(currentPassword, user.password);
    if (!isValid) {
      throw new UnauthorizedException('Mật khẩu hiện tại không chính xác');
    }

    if (newPassword.length < 6) {
      throw new BadRequestException('Mật khẩu mới phải có ít nhất 6 ký tự');
    }

    const hashed = await bcrypt.hash(newPassword, 10);
    await this.prisma.user.update({
      where: { id: userId },
      data: { password: hashed },
    });

    return { message: 'Đổi mật khẩu thành công' };
  }

  async updateProfile(userId: number, name?: string) {
    const updated = await this.prisma.user.update({
      where: { id: userId },
      data: { name },
    });
    const { password: _, ...result } = updated;
    return result;
  }

  async removeAccount(userId: number, projectsService: any) {
    // 1. Find all projects belonging to this user
    const projects = await this.prisma.project.findMany({
      where: { userId },
    });

    // 2. Delete each project (this handles database and container cleanup)
    for (const project of projects) {
      await projectsService.deleteProject(project.id);
    }

    // 3. Delete the user record
    await this.prisma.user.delete({
      where: { id: userId },
    });

    return { message: 'Tài khoản và toàn bộ dữ liệu liên quan đã được xóa vĩnh viễn' };
  }
}
