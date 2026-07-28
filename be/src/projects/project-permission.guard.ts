import { CanActivate, ExecutionContext, Injectable, ForbiddenException, NotFoundException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PrismaService } from '../prisma/prisma.service';
import { REQUIRE_PERMISSION_KEY } from '../common/decorators/require-permission.decorator';

@Injectable()
export class ProjectPermissionGuard implements CanActivate {
  constructor(
    private prisma: PrismaService,
    private reflector: Reflector,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    // 1. Lấy mã hành động yêu cầu từ Metadata
    const requiredPermission = this.reflector.getAllAndOverride<string>(
      REQUIRE_PERMISSION_KEY,
      [context.getHandler(), context.getClass()]
    );

    if (!requiredPermission) return true;

    const request = context.switchToHttp().getRequest();
    const user = request.user;
    if (!user) return false;

    // Chỉ Super Admin tối cao (superadmin@potato.com) mới được bypass toàn bộ Guard
    if (user.role === 'ADMIN' && user.email === 'superadmin@potato.com') return true;

    // 2. Lấy thông tin chi tiết user và Custom Role của họ
    const dbUser = await this.prisma.user.findUnique({
      where: { id: user.id },
      include: { customRole: true },
    });
    if (!dbUser) return false;

    // Tenant Admin: parentId = null và không phải superadmin → chủ doanh nghiệp, bypass mọi system: permission
    const isTenantAdmin = dbUser.parentId === null && user.email !== 'superadmin@potato.com';
    if (isTenantAdmin) return true;

    // 3. Check quyền hệ thống toàn cục (Custom Role)
    const globalPermissions: string[] = dbUser.customRole?.permissions || [];
    
    // Nếu có quyền quản lý toàn bộ dự án hệ thống -> Cho phép
    if (globalPermissions.includes('system:project:manage_all')) return true;

    // Nếu hành động là quyền hệ thống, đối chiếu với Custom Role
    if (requiredPermission.startsWith('system:')) {
      if (globalPermissions.includes(requiredPermission)) return true;
      throw new ForbiddenException(`Bạn không có quyền thực hiện thao tác này. Vui lòng liên hệ Quản trị viên để được cấp quyền.`);
    }

    // 4. Xác định Project ID từ request
    const projectIdStr = request.params?.id || request.body?.projectId;
    if (!projectIdStr) {
      // Nếu không có Project ID, nhưng yêu cầu quyền dự án (VD: API chung)
      // Check xem Custom Role toàn cục có quyền này hay không
      if (globalPermissions.includes(requiredPermission)) return true;
      
      // Nếu là API list hoặc không chỉ định project, cho đi tiếp, controller/service sẽ tự lọc theo parentId
      return true;
    }

    const projectId = parseInt(projectIdStr, 10);
    if (isNaN(projectId)) return false;

    // 5. Lấy thông tin dự án
    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
    });
    if (!project) {
      throw new NotFoundException('Dự án không tồn tại.');
    }

    // 6. Tenant Isolation Check (Cô lập dữ liệu doanh nghiệp)
    // Xác định Admin quản lý của User
    const userAdminId = dbUser.parentId || dbUser.id;

    // Xác định Admin quản lý của dự án (Chủ sở hữu dự án)
    const projectOwner = await this.prisma.user.findUnique({
      where: { id: project.userId },
    });
    const projectAdminId = projectOwner?.parentId || projectOwner?.id;

    if (userAdminId !== projectAdminId) {
      throw new ForbiddenException('Bạn không có quyền truy cập vào dự án của doanh nghiệp khác.');
    }

    // Nếu chính Admin của Tenant là người truy cập -> Cho phép toàn quyền
    if (dbUser.id === project.userId) return true;

    // 7. Project-level Role Check (Kiểm tra quyền nội bộ dự án)
    const membership = await this.prisma.projectMember.findUnique({
      where: {
        userId_projectId: {
          userId: dbUser.id,
          projectId: projectId,
        },
      },
    });

    if (!membership) {
      throw new ForbiddenException('Bạn không phải là thành viên của dự án này.');
    }

    // Quyền hạn thực tế của user trong dự án sẽ lấy trực tiếp từ Custom Role hệ thống của họ!
    const allowedPermissions = dbUser.customRole?.permissions || [];

    if (allowedPermissions.includes(requiredPermission)) {
      return true;
    }

    throw new ForbiddenException(
      `Bạn không có quyền thực hiện thao tác này. Vui lòng liên hệ Quản trị viên để được cấp quyền.`
    );
  }
}
