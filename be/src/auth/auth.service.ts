import { Injectable, ConflictException, UnauthorizedException, BadRequestException, NotFoundException, Inject, forwardRef } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import * as bcrypt from 'bcrypt';
import { Role } from '@prisma/client';
import { ProjectsService } from '../projects/projects.service';

import { MailService } from '../mail/mail.service';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
    @Inject(forwardRef(() => ProjectsService))
    private projectsService: ProjectsService,
    private mailService: MailService,
  ) {}

  // ─── Helpers ─────────────────────────────────────────────────────────

  // Ký và tạo ra mã thông báo JWT bí mật chứa thông tin cơ bản của user
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
    const { email, password, name, parentId } = registerDto;

    const existingUser = await this.prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      throw new ConflictException('Email đã tồn tại trên hệ thống');
    }

    // Mã hoá mật khẩu thành chuỗi hash bảo mật bằng thuật toán Bcrypt
    const hashedPassword = await bcrypt.hash(password, 10);
    // Nếu có parentId -> Nhân viên do Admin Project tạo -> Cấp vai trò DEVELOPER
    // Nếu không có parentId -> Người dùng tự đăng ký -> Cấp vai trò ADMIN (Admin Project)
    let assignedRole: Role = Role.ADMIN;
    let validParentId = parentId || null;

    if (validParentId) {
      const parentUser = await this.prisma.user.findUnique({ where: { id: validParentId } });
      if (!parentUser) {
        throw new BadRequestException('Tài khoản quản lý (parentId) không tồn tại.');
      }
      assignedRole = Role.DEVELOPER;
    }

    const user = await this.prisma.user.create({
      data: { email, password: hashedPassword, name, role: assignedRole, parentId: validParentId },
      include: { customRole: true },
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

    const user = await this.prisma.user.findUnique({
      where: { email },
      include: { customRole: true },
    });
    if (!user) {
      throw new UnauthorizedException('Thông tin đăng nhập không chính xác');
    }

    // So khớp mật khẩu người dùng nhập với chuỗi hash trong CSDL
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

  // ─── Reset Password ──────────────────────────────────────────────────

  async forgotPassword(email: string) {
    // [GIẢI THÍCH LUỒNG: BƯỚC 1 - TÌM TÀI KHOẢN]
    // Hàm này sẽ kiểm tra xem email người dùng nhập vào có tồn tại trong Database hay không.
    const user = await this.prisma.user.findUnique({ where: { email } });
    if (!user) {
      // Vì lý do bảo mật, không báo lỗi nếu email không tồn tại để tránh lộ thông tin người dùng.
      return { message: 'Nếu email tồn tại, một đường link khôi phục đã được gửi.' };
    }

    // [GIẢI THÍCH LUỒNG: BƯỚC 2 - TẠO MÃ BẢO MẬT (TOKEN)]
    // Tạo token ngẫu nhiên (dài 64 ký tự hex) để làm link đổi mật khẩu.
    const crypto = require('crypto');
    const resetToken = crypto.randomBytes(32).toString('hex');
    const resetTokenExpiry = new Date();
    resetTokenExpiry.setMinutes(resetTokenExpiry.getMinutes() + 15); // Hết hạn sau 15 phút

    // [GIẢI THÍCH LUỒNG: BƯỚC 3 - LƯU TOKEN VÀO DATABASE]
    // Cập nhật token và thời gian hết hạn vào thông tin của người dùng.
    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        resetPasswordToken: resetToken,
        resetPasswordExpires: resetTokenExpiry,
      },
    });

    // [GIẢI THÍCH LUỒNG: BƯỚC 4 - GỬI EMAIL CHỨA LINK KHÔI PHỤC]
    // Gọi tới MailService để gửi email chứa đường link (ví dụ: http://localhost:3000/reset-password?token=...)
    await this.mailService.sendPasswordResetEmail(user.email, resetToken);

    return { message: 'Nếu email tồn tại, một đường link khôi phục đã được gửi.' };
  }

  async resetPassword(token: string, newPassword: string) {
    // [GIẢI THÍCH LUỒNG: BƯỚC 5 - NGƯỜI DÙNG BẤM LINK VÀ NHẬP PASS MỚI]
    if (newPassword.length < 6) {
      throw new BadRequestException('Mật khẩu mới phải có ít nhất 6 ký tự');
    }

    // [GIẢI THÍCH LUỒNG: BƯỚC 6 - KIỂM TRA TOKEN]
    // Tìm người dùng có token khớp với token gửi lên và token đó vẫn còn hạn (resetPasswordExpires > Date.now())
    const user = await this.prisma.user.findFirst({
      where: {
        resetPasswordToken: token,
        resetPasswordExpires: { gt: new Date() }, // Kiểm tra còn hạn không
      },
    });

    if (!user) {
      throw new BadRequestException('Mã khôi phục không hợp lệ hoặc đã hết hạn.');
    }

    // [GIẢI THÍCH LUỒNG: BƯỚC 7 - ĐỔI MẬT KHẨU & XÓA TOKEN]
    // Mã hóa mật khẩu mới trước khi lưu.
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // Cập nhật mật khẩu và quan trọng nhất: xóa token đi để không bị dùng lại lần 2 (ngừa tấn công Replay Attack).
    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        password: hashedPassword,
        resetPasswordToken: null,
        resetPasswordExpires: null,
      },
    });

    return { message: 'Mật khẩu đã được thay đổi thành công. Bạn có thể đăng nhập bằng mật khẩu mới.' };
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

  async getProfile(userId: number) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { customRole: true },
    });
    if (!user) throw new NotFoundException('Người dùng không tồn tại');
    const { password: _, ...userWithoutPassword } = user;
    return userWithoutPassword;
  }

  async updateProfile(userId: number, name?: string) {
    const updated = await this.prisma.user.update({
      where: { id: userId },
      data: { name },
    });
    const { password: _, ...result } = updated;
    return result;
  }

  async removeAccount(userId: number) {
    // 1. Find all projects belonging to this user
    const projects = await this.prisma.project.findMany({
      where: { userId },
    });

    // 2. Delete each project (this handles database and container cleanup)
    for (const project of projects) {
      await this.projectsService.deleteProject(project.id);
    }

    // 3. Delete the user record
    await this.prisma.user.delete({
      where: { id: userId },
    });

    return { message: 'Tài khoản và toàn bộ dữ liệu liên quan đã được xóa vĩnh viễn' };
  }
}
