import { Controller, Get, Redirect, UseGuards, Request, ForbiddenException, Delete, Param, Patch, Body, ParseIntPipe, BadRequestException, NotFoundException, ConflictException } from '@nestjs/common';
import { AppService } from './app.service';
import { JwtAuthGuard } from './auth/jwt-auth.guard';
import { PrismaService } from './prisma/prisma.service';
import { ProjectsService } from './projects/projects.service';
import { ProjectPermissionGuard } from './projects/project-permission.guard';
import { RequirePermission } from './common/decorators/require-permission.decorator';
import * as os from 'os';
import * as fs from 'fs';
import * as bcrypt from 'bcrypt';

@Controller()
export class AppController {
  constructor(
    private readonly appService: AppService,
    private readonly prisma: PrismaService,
    private readonly projectsService: ProjectsService,
  ) {}

  @Get()
  @Redirect('http://localhost:3001', 301)
  getHello() {
    return { url: 'http://localhost:3001' };
  }

  /**
   * GET /api/admin/system-stats
   * Trả về thông số tài nguyên thực tế của máy chủ Host.
   * Chỉ dành cho ADMIN hoặc tài khoản có quyền system:infrastructure:read.
   */
  @Get('admin/system-stats')
  @UseGuards(JwtAuthGuard, ProjectPermissionGuard)
  @RequirePermission('system:infrastructure:read')
  async getSystemStats(@Request() req: any) {
    // [KỸ THUẬT ROOT USER]
    // Đây là cốt lõi của việc phân biệt Super Admin và Tenant Admin (Chủ doanh nghiệp thuê bao).
    // Hệ thống không cần tạo thêm Role 'SUPER_ADMIN' trong Database để tối ưu.
    // Thay vào đó, bất cứ ai có role là ADMIN + email là 'superadmin@potato.com' 
    // sẽ được Hardcode phong làm Root User (Tối cao).
    const isSuperAdmin = req.user.role === 'ADMIN' && req.user.email === 'superadmin@potato.com';
    if (!isSuperAdmin) {
      throw new ForbiddenException('Quyền truy cập bị từ chối. Chỉ Super Admin mới được xem giám sát hệ thống.');
    }
    // ── RAM ──────────────────────────────────────────
    const totalRamBytes = os.totalmem();
    const freeRamBytes = os.freemem();
    const usedRamBytes = totalRamBytes - freeRamBytes;
    const totalRamGB = +(totalRamBytes / 1024 ** 3).toFixed(2);
    const usedRamGB = +(usedRamBytes / 1024 ** 3).toFixed(2);
    const freeRamGB = +(freeRamBytes / 1024 ** 3).toFixed(2);
    const ramUsagePercent = +((usedRamBytes / totalRamBytes) * 100).toFixed(1);

    // ── CPU ──────────────────────────────────────────
    const cpus = os.cpus();
    const cpuModel = cpus[0]?.model ?? 'Unknown CPU';
    const cpuCores = cpus.length;
    const loadAvg = os.loadavg(); // [1min, 5min, 15min]
    const cpuLoadPercent = +((loadAvg[0] / cpuCores) * 100).toFixed(1);

    // ── DISK ─────────────────────────────────────────
    let diskTotal = 0;
    let diskFree = 0;
    try {
      const diskPath = process.cwd();
      const stat = (fs as any).statfsSync(diskPath);
      diskTotal = stat.blocks * stat.bsize;
      diskFree = stat.bfree * stat.bsize;
    } catch {
      diskTotal = 0;
      diskFree = 0;
    }
    const diskTotalGB = +(diskTotal / 1024 ** 3).toFixed(1);
    const diskFreeGB = +(diskFree / 1024 ** 3).toFixed(1);
    const diskUsedGB = +(diskTotalGB - diskFreeGB).toFixed(1);
    const diskUsagePercent = diskTotal > 0
      ? +((1 - diskFree / diskTotal) * 100).toFixed(1)
      : 0;

    // ── SYSTEM INFO ──────────────────────────────────
    const uptimeSeconds = os.uptime();
    const uptimeDays = Math.floor(uptimeSeconds / 86400);
    const uptimeHours = Math.floor((uptimeSeconds % 86400) / 3600);
    const uptimeMinutes = Math.floor((uptimeSeconds % 3600) / 60);

    const platform = os.platform(); // 'win32', 'linux', 'darwin'
    const platformLabel =
      platform === 'win32' ? 'Windows' :
      platform === 'linux' ? 'Linux' :
      platform === 'darwin' ? 'macOS' : platform;

    // ── DATABASE STATS ───────────────────────────────
    const [totalUsers, totalProjects, runningProjects, totalDatabases] = await Promise.all([
      this.prisma.user.count(),
      this.prisma.project.count(),
      this.prisma.project.count({ where: { status: 'running' } }),
      this.prisma.databaseInstance.count(),
    ]);

    return {
      ram: { totalGB: totalRamGB, usedGB: usedRamGB, freeGB: freeRamGB, usagePercent: ramUsagePercent },
      cpu: { model: cpuModel, cores: cpuCores, loadAvg1m: +loadAvg[0].toFixed(2), loadAvg5m: +loadAvg[1].toFixed(2), usagePercent: Math.min(cpuLoadPercent, 100) },
      disk: { totalGB: diskTotalGB, usedGB: diskUsedGB, freeGB: diskFreeGB, usagePercent: diskUsagePercent },
      system: { platform: platformLabel, uptime: { days: uptimeDays, hours: uptimeHours, minutes: uptimeMinutes } },
      platform: { totalUsers, totalProjects, runningProjects, totalDatabases },
    };
  }

  /**
   * GET /api/tenant/quota-usage
   * Lấy thông số tài nguyên sử dụng thực tế của doanh nghiệp so với Quota.
   * Dành cho tất cả tài khoản đã đăng nhập (sẽ trả về quota của doanh nghiệp họ).
   */
  @Get('tenant/quota-usage')
  @UseGuards(JwtAuthGuard)
  async getTenantQuotaUsage(@Request() req: any) {
    const userId = req.user.id;
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });
    if (!user) throw new NotFoundException('Không tìm thấy tài khoản.');

    const adminId = user.parentId || user.id;
    const admin = await this.prisma.user.findUnique({
      where: { id: adminId },
    });
    if (!admin) throw new NotFoundException('Không tìm thấy Admin quản lý.');

    // 1. Số lượng dự án (Projects) đã tạo của Tenant
    const projectsUsed = await this.prisma.project.count({
      where: {
        OR: [
          { userId: adminId },
          { user: { parentId: adminId } }
        ]
      }
    });

    // 2. Số lượng Database đã tạo của Tenant
    const databasesUsed = await this.prisma.databaseInstance.count({
      where: {
        project: {
          OR: [
            { userId: adminId },
            { user: { parentId: adminId } }
          ]
        }
      }
    });

    // 3. Số lượng nhân viên (Developer) thuộc Tenant
    const subUsersCount = await this.prisma.user.count({
      where: { parentId: adminId }
    });

    // 4. Dung lượng RAM đang chiếm dụng bởi các container đang running
    const runningProjects = await this.prisma.project.findMany({
      where: {
        status: 'running',
        OR: [
          { userId: adminId },
          { user: { parentId: adminId } }
        ]
      },
      select: { ramLimit: true }
    });
    const ramUsed = runningProjects.reduce((sum, p) => sum + p.ramLimit, 0);

    return {
      projects: { used: projectsUsed, limit: admin.maxProjects },
      databases: { used: databasesUsed, limit: admin.maxDatabases },
      users: { used: subUsersCount + 1, limit: 3 }, // Tính cả tài khoản Admin doanh nghiệp
      ram: { used: ramUsed, limit: admin.maxRam },
      disk: { used: 0, limit: admin.maxDisk },
    };
  }

  /**
   * GET /api/admin/users
   * Trả về danh sách người dùng trên hệ thống kèm số lượng dự án của họ.
   * Chỉ dành cho ADMIN hoặc tài khoản có quyền system:user:manage.
   */
  @Get('admin/users')
  @UseGuards(JwtAuthGuard, ProjectPermissionGuard)
  @RequirePermission('system:user:manage')
  async getUsers(@Request() req: any) {
    const isSystemAdmin = req.user.role === 'ADMIN' && req.user.email === 'superadmin@potato.com';
    // [CÔ LẬP DỮ LIỆU - TENANT ISOLATION]
    // Nếu là Super Admin tối cao -> Được lấy TOÀN BỘ tài khoản (where = {})
    // Nếu chỉ là Chủ doanh nghiệp (Tenant Admin) -> Chỉ được lấy các nhân viên cấp dưới thuộc công ty mình (parentId = req.user.id)
    const whereCondition = isSystemAdmin ? {} : { parentId: req.user.id };

    return this.prisma.user.findMany({
      where: whereCondition,
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        parentId: true,
        customRoleId: true,
        customRole: {
          select: {
            id: true,
            name: true,
            assignableByManager: true,
            permissions: true,
          },
        },
        memberships: {
          select: {
            projectId: true,
          },
        },
        createdAt: true,
        _count: {
          select: { projects: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * PATCH /api/users/:id/role
   * Thay đổi vai trò hệ thống hoặc vai trò tùy biến (Custom Role) của người dùng.
   * Chỉ dành cho ADMIN hoặc Manager có quyền system:user:manage.
   */
  @Patch('users/:id/role')
  @UseGuards(JwtAuthGuard, ProjectPermissionGuard)
  @RequirePermission('system:user:manage')
  async updateUserRole(
    @Request() req: any,
    @Param('id', ParseIntPipe) id: number,
    @Body('role') role?: 'ADMIN' | 'DEVELOPER',
    @Body('customRoleId') customRoleId?: number | null,
    @Body('projectIds') projectIds?: number[],
  ) {
    const requester = await this.prisma.user.findUnique({
      where: { id: req.user.id },
      include: { customRole: true },
    });
    if (!requester) {
      throw new ForbiddenException('Không tìm thấy tài khoản người yêu cầu.');
    }

    // [PHÂN LOẠI 3 CẤP ĐỘ QUẢN TRỊ]
    // 1. Super Admin: Quản lý tối cao của cả hệ thống Potato PaaS.
    // 2. Tenant Admin: Giám đốc/Chủ của 1 công ty thuê bao (Chỉ được quản lý nhân viên của công ty mình).
    // 3. Sub-Manager: Trưởng phòng (Là DEVELOPER nhưng được gán quyền Manager, có thể gán quyền cho nhân viên khác).
    const isSuperAdmin = requester.role === 'ADMIN' && requester.email === 'superadmin@potato.com';
    const isTenantAdmin = requester.role === 'ADMIN' && requester.email !== 'superadmin@potato.com';
    const isSubManager = !isSuperAdmin && !isTenantAdmin;

    const targetUser = await this.prisma.user.findUnique({ where: { id } });
    if (!targetUser) {
      throw new NotFoundException('Người dùng không tồn tại.');
    }

    if (id === req.user.id) {
      throw new BadRequestException('Không thể tự thay đổi quyền của chính mình.');
    }

    // Nếu người thực hiện không phải Super Admin
    if (!isSuperAdmin) {
      if (targetUser.role === 'ADMIN') {
        throw new ForbiddenException('Chỉ Super Admin mới được phép sửa quyền của Super Admin khác.');
      }
      
      const targetUserAdminId = targetUser.parentId || targetUser.id;
      const requesterAdminId = requester.parentId || requester.id;
      if (targetUserAdminId !== requesterAdminId) {
        throw new ForbiddenException('Bạn không có quyền quản lý tài khoản của doanh nghiệp khác.');
      }

      if (role === 'ADMIN') {
        throw new ForbiddenException('Chỉ Super Admin mới có quyền nâng cấp tài khoản lên Super Admin.');
      }

      // Kiểm tra gán Custom Role
      if (customRoleId) {
        const customRole = await this.prisma.customRole.findUnique({ where: { id: customRoleId } });
        if (!customRole) {
          throw new NotFoundException('Vai trò tùy biến không tồn tại.');
        }

        // Custom Role phải do chính Admin này tạo ra (ownerId === requesterAdminId) hoặc là role hệ thống (ownerId = null)
        if (customRole.ownerId !== null && customRole.ownerId !== requesterAdminId) {
          throw new ForbiddenException('Bạn không được phép gán vai trò của doanh nghiệp khác.');
        }

        // Chỉ Sub-Manager (nhân viên cấp dưới) mới bị kiểm tra cờ assignableByManager
        if (isSubManager && !customRole.assignableByManager) {
          throw new ForbiddenException('Vai trò tùy biến này chưa được Admin của bạn ủy quyền cho phép Manager gán.');
        }
      }
    } else {
      // Đối với Super Admin tối cao
      if (targetUser.role === 'ADMIN') {
        throw new ForbiddenException('Super Admin không được phép sửa quyền của Super Admin khác.');
      }
    }

    // Thực hiện cập nhật
    const updateData: any = {};
    if (role) {
      updateData.role = role;
      if (role === 'ADMIN') {
        updateData.customRoleId = null;
      }
    }
    if (customRoleId !== undefined) {
      updateData.customRoleId = customRoleId;
      if (customRoleId !== null) {
        updateData.role = 'DEVELOPER'; // Mặc định chuyển về DEVELOPER khi dùng vai trò tùy biến
      }
    }

    const updatedUser = await this.prisma.user.update({
      where: { id },
      data: updateData,
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        customRole: {
          select: { id: true, name: true },
        },
      },
    });

    // Cập nhật các dự án mà user tham gia (ProjectMember) nếu có truyền lên
    if (projectIds !== undefined) {
      // Parse sang số nguyên (phòng trường hợp frontend gửi string)
      const parsedProjectIds = (projectIds || []).map((p) => parseInt(String(p), 10)).filter((p) => !isNaN(p));

      // 1. Xóa các membership cũ
      await this.prisma.projectMember.deleteMany({
        where: { userId: id }
      });

      // 2. Kiểm tra xem các projectId có tồn tại không trước khi insert
      if (parsedProjectIds.length > 0) {
        const existingProjects = await this.prisma.project.findMany({
          where: { id: { in: parsedProjectIds } },
          select: { id: true },
        });
        const validProjectIds = existingProjects.map((p) => p.id);

        if (validProjectIds.length > 0) {
          await this.prisma.projectMember.createMany({
            data: validProjectIds.map(projectId => ({
              userId: id,
              projectId,
              role: 'VIEWER',
              permissions: [],
            }))
          });
        }
      }
    }

    return {
      message: `Đã cập nhật vai trò và dự án của "${updatedUser.email}" thành công.`,
      user: updatedUser,
    };
  }

  /**
   * DELETE /api/admin/users/:id
   * Xóa tài khoản người dùng cùng toàn bộ dự án và database liên quan.
   * Chỉ dành cho ADMIN hoặc tài khoản có quyền system:user:manage.
   */
  @Delete('admin/users/:id')
  @UseGuards(JwtAuthGuard, ProjectPermissionGuard)
  @RequirePermission('system:user:manage')
  async deleteUser(
    @Request() req: any,
    @Param('id', ParseIntPipe) id: number,
  ) {
    const requester = await this.prisma.user.findUnique({
      where: { id: req.user.id },
    });
    if (!requester) {
      throw new ForbiddenException('Không tìm thấy tài khoản người yêu cầu.');
    }

    const userToDelete = await this.prisma.user.findUnique({ where: { id } });
    if (!userToDelete) {
      throw new NotFoundException('Người dùng không tồn tại.');
    }

    if (userToDelete.role === 'ADMIN') {
      throw new BadRequestException('Không thể xóa tài khoản Admin.');
    }

    // Tenant isolation:
    // [CÔ LẬP XÓA TÀI KHOẢN]
    // Chặn đứng việc Công ty A táy máy xóa nhân viên của Công ty B.
    const isSystemAdmin = requester.role === 'ADMIN' && requester.email === 'superadmin@potato.com';
    if (!isSystemAdmin && userToDelete.parentId !== requester.id) {
      throw new ForbiddenException('Bạn không có quyền xóa tài khoản của doanh nghiệp khác.');
    }

    // 1. Tìm toàn bộ các dự án của người dùng này
    const projects = await this.prisma.project.findMany({
      where: { userId: id },
    });

    // 2. Dừng và xóa từng dự án (bao gồm container và database phụ trợ)
    for (const project of projects) {
      await this.projectsService.deleteProject(project.id);
    }

    // 3. Xóa bản ghi người dùng khỏi Database
    await this.prisma.user.delete({
      where: { id },
    });

    return {
      message: `Đã xóa tài khoản "${userToDelete.email}" và giải phóng toàn bộ tài nguyên liên quan thành công.`,
    };
  }

  /**
   * PATCH /api/admin/users/:id
   * Chỉnh sửa thông tin tài khoản người dùng (Họ tên, Email, Mật khẩu mới).
   * Chỉ dành cho ADMIN hoặc tài khoản có quyền system:user:manage.
   */
  @Patch('admin/users/:id')
  @UseGuards(JwtAuthGuard, ProjectPermissionGuard)
  @RequirePermission('system:user:manage')
  async updateUser(
    @Request() req: any,
    @Param('id', ParseIntPipe) id: number,
    @Body('name') name?: string,
    @Body('email') email?: string,
    @Body('password') password?: string,
  ) {
    const requester = await this.prisma.user.findUnique({
      where: { id: req.user.id },
    });
    if (!requester) {
      throw new ForbiddenException('Không tìm thấy tài khoản người yêu cầu.');
    }

    const targetUser = await this.prisma.user.findUnique({ where: { id } });
    if (!targetUser) {
      throw new NotFoundException('Người dùng không tồn tại.');
    }

    const isRequesterAdmin = requester.role === 'ADMIN' && requester.email === 'superadmin@potato.com';

    // Ràng buộc bảo mật:
    if (targetUser.role === 'ADMIN') {
      if (!isRequesterAdmin) {
        throw new ForbiddenException('Chỉ Admin tối cao mới có quyền sửa đổi thông tin của Admin khác.');
      }
      if (targetUser.id !== requester.id) {
        throw new ForbiddenException('Admin không được phép sửa đổi thông tin của Admin khác.');
      }
    } else {
      if (!isRequesterAdmin && targetUser.parentId !== requester.id) {
        throw new ForbiddenException('Bạn không có quyền sửa đổi thông tin của người dùng thuộc doanh nghiệp khác.');
      }
    }

    const updateData: any = {};
    if (name !== undefined) {
      updateData.name = name;
    }

    if (email !== undefined && email !== targetUser.email) {
      const existing = await this.prisma.user.findUnique({ where: { email } });
      if (existing) {
        throw new ConflictException('Email đã tồn tại trên hệ thống.');
      }
      updateData.email = email;
    }

    if (password) {
      if (password.length < 6) {
        throw new BadRequestException('Mật khẩu mới phải từ 6 ký tự trở lên.');
      }
      updateData.password = await bcrypt.hash(password, 10);
    }

    const updatedUser = await this.prisma.user.update({
      where: { id },
      data: updateData,
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
      },
    });

    return {
      message: `Đã cập nhật thông tin tài khoản của "${updatedUser.email}" thành công.`,
      user: updatedUser,
    };
  }
}
