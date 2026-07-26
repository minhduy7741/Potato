import { Controller, Get, Post, Patch, Delete, Body, Param, ParseIntPipe, UseGuards, Request, ForbiddenException, ConflictException, BadRequestException, NotFoundException } from '@nestjs/common';
import { JwtAuthGuard } from './jwt-auth.guard';
import { PrismaService } from '../prisma/prisma.service';

@Controller('roles')
@UseGuards(JwtAuthGuard)
export class RolesController {
  constructor(private prisma: PrismaService) {}

  private async checkPermission(req: any) {
    // Super Admin luôn được phép
    if (req.user?.role === 'ADMIN' && req.user?.email === 'superadmin@potato.com') return;

    const dbUser = await this.prisma.user.findUnique({
      where: { id: req.user.id },
      include: { customRole: true },
    });

    // Tenant Admin: parentId = null và không phải superadmin → là chủ doanh nghiệp, được phép toàn quyền
    const isTenantAdmin = dbUser?.parentId === null && req.user?.email !== 'superadmin@potato.com';
    if (isTenantAdmin) return;

    // Sub-user có quyền system:role:manage cũng được phép
    const isManager = dbUser?.customRole?.permissions?.includes('system:role:manage');
    if (isManager) return;

    throw new ForbiddenException('Chỉ dành cho quản trị viên hoặc tài khoản có quyền quản lý vai trò (system:role:manage).');
  }

  /**
   * GET /api/roles
   * Trả về danh sách vai trò tùy biến.
   */
  @Get()
  async getRoles(@Request() req: any) {
    await this.checkPermission(req);
    const isSystemAdmin = req.user?.role === 'ADMIN' && req.user?.email === 'superadmin@potato.com';
    if (isSystemAdmin) {
      return this.prisma.customRole.findMany({ orderBy: { createdAt: 'asc' } });
    }

    const dbUser = await this.prisma.user.findUnique({
      where: { id: req.user.id }
    });

    // Chuẩn hóa về Admin gốc của tenant (không dùng parentId của sub-manager)
    const tenantAdminId = dbUser?.parentId ?? dbUser?.id;

    // Chỉ trả về role của tenant này, KHÔNG trả về role của tenant khác hay system role (ownerId=null)
    return this.prisma.customRole.findMany({
      where: { ownerId: tenantAdminId },
      orderBy: { createdAt: 'asc' }
    });
  }

  /**
   * POST /api/roles
   * Tạo vai trò tùy biến mới.
   */
  @Post()
  async createRole(
    @Request() req: any,
    @Body('name') name: string,
    @Body('permissions') permissions: string[],
    @Body('assignableByManager') assignableByManager?: boolean,
  ) {
    await this.checkPermission(req);

    if (!name || name.trim() === '') {
      throw new BadRequestException('Tên vai trò không được để trống.');
    }

    const isSystemAdmin = req.user?.role === 'ADMIN' && req.user?.email === 'superadmin@potato.com';

    // Luôn gán ownerId về Admin gốc của tenant (kể cả khi sub-manager tạo role)
    let ownerId: number | null = null;
    if (!isSystemAdmin) {
      const dbUser = await this.prisma.user.findUnique({ where: { id: req.user.id } });
      ownerId = dbUser?.parentId ?? dbUser?.id ?? req.user.id;
    }

    const existing = await this.prisma.customRole.findFirst({
      where: {
        name,
        ownerId: ownerId,
      }
    });
    if (existing) throw new ConflictException('Tên vai trò đã tồn tại trên hệ thống.');

    let canAssignByManager = false;
    if (isSystemAdmin && assignableByManager !== undefined) {
      canAssignByManager = assignableByManager;
    }

    return this.prisma.customRole.create({
      data: { 
        name, 
        permissions: permissions || [], 
        assignableByManager: canAssignByManager,
        ownerId: ownerId,
      },
    });
  }

  /**
   * PATCH /api/roles/:id
   * Cập nhật vai trò tùy biến.
   */
  @Patch(':id')
  async updateRole(
    @Request() req: any,
    @Param('id', ParseIntPipe) id: number,
    @Body('name') name?: string,
    @Body('permissions') permissions?: string[],
    @Body('assignableByManager') assignableByManager?: boolean,
  ) {
    await this.checkPermission(req);

    const role = await this.prisma.customRole.findUnique({ where: { id } });
    if (!role) throw new NotFoundException('Vai trò không tồn tại.');

    const isSystemAdmin = req.user?.role === 'ADMIN' && req.user?.email === 'superadmin@potato.com';
    if (!isSystemAdmin && role.ownerId !== req.user.id) {
      throw new ForbiddenException('Bạn không có quyền chỉnh sửa vai trò của doanh nghiệp khác.');
    }

    if (name && name !== role.name) {
      const duplicate = await this.prisma.customRole.findFirst({
        where: {
          name,
          ownerId: role.ownerId,
        }
      });
      if (duplicate) throw new ConflictException('Tên vai trò đã tồn tại trên hệ thống.');
    }

    const updateData: any = {};
    if (name !== undefined) updateData.name = name;
    if (permissions !== undefined) updateData.permissions = permissions;
    
    if (isSystemAdmin && assignableByManager !== undefined) {
      updateData.assignableByManager = assignableByManager;
    }

    return this.prisma.customRole.update({ where: { id }, data: updateData });
  }

  /**
   * DELETE /api/roles/:id
   * Xóa vai trò tùy biến.
   */
  @Delete(':id')
  async deleteRole(@Request() req: any, @Param('id', ParseIntPipe) id: number) {
    await this.checkPermission(req);

    const role = await this.prisma.customRole.findUnique({ where: { id } });
    if (!role) throw new NotFoundException('Vai trò không tồn tại.');

    const isSystemAdmin = req.user?.role === 'ADMIN' && req.user?.email === 'superadmin@potato.com';
    if (!isSystemAdmin && role.ownerId !== req.user.id) {
      throw new ForbiddenException('Bạn không có quyền xóa vai trò của doanh nghiệp khác.');
    }

    await this.prisma.customRole.delete({ where: { id } });
    return { message: `Đã xóa vai trò "${role.name}" thành công.` };
  }
}
