import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  ParseIntPipe,
  HttpCode,
  HttpStatus,
  Logger,
  UseGuards,
  Request,
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { ProjectsService } from './projects.service';
import { PrismaService } from '../prisma/prisma.service';
import { StatsCollectorService } from './stats-collector.service';
import { CreateProjectDto } from './dto/create-project.dto';
import { CreateEnvVariableDto } from './dto/create-env-variable.dto';
import { UpdateEnvVariableDto } from './dto/update-env-variable.dto';
import { UpdateResourcesDto } from './dto/update-resources.dto';
import { GitDeployDto } from './dto/git-deploy.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { ProjectRole } from '@prisma/client';
import { ProjectPermissionGuard } from './project-permission.guard';
import { RequirePermission } from '../common/decorators/require-permission.decorator';

/**
 * ProjectsController — REST API endpoints for project container management.
 *
 * Base path: /api/projects
 */
@Controller('projects')
@UseGuards(JwtAuthGuard, ProjectPermissionGuard)
export class ProjectsController {
  private readonly logger = new Logger(ProjectsController.name);

  constructor(
    private readonly projectsService: ProjectsService,
    private readonly statsCollectorService: StatsCollectorService,
    private readonly prisma: PrismaService,
  ) {}

  @Post()
  @RequirePermission('system:project:create')
  @HttpCode(HttpStatus.CREATED)
  async create(@Request() req: any, @Body() createProjectDto: CreateProjectDto) {
    const userId: number = req.user.id;
    this.logger.log(`POST /projects — Creating "${createProjectDto.name}" for user ${userId}`);

    const requester = await this.prisma.user.findUnique({
      where: { id: userId }
    });
    if (!requester) throw new ForbiddenException('Không tìm thấy tài khoản.');

    // Xác định Admin quản lý
    const adminId = requester.parentId || requester.id;
    const admin = await this.prisma.user.findUnique({
      where: { id: adminId }
    });
    if (!admin) throw new ForbiddenException('Không tìm thấy Admin quản lý.');

    // 1. Kiểm tra giới hạn số lượng dự án (maxProjects)
    const tenantProjectsCount = await this.prisma.project.count({
      where: {
        OR: [
          { userId: adminId },
          { user: { parentId: adminId } }
        ]
      }
    });

    if (tenantProjectsCount >= admin.maxProjects) {
      throw new BadRequestException(`Doanh nghiệp của bạn đã vượt quá giới hạn số lượng dự án cho phép (Tối đa: ${admin.maxProjects} dự án). Vui lòng liên hệ Super Admin để nâng cấp.`);
    }

    // 2. Kiểm tra giới hạn RAM cho dự án mới (mặc định là 256MB)
    const newProjectRam = 256; // MB

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
    const currentTotalRam = runningProjects.reduce((sum, p) => sum + p.ramLimit, 0);

    if (currentTotalRam + newProjectRam > admin.maxRam) {
      throw new BadRequestException(`Vượt quá giới hạn dung lượng RAM được cấp phát cho doanh nghiệp (Cấp phép tối đa: ${admin.maxRam} MB, Đang dùng: ${currentTotalRam} MB, Yêu cầu: ${newProjectRam} MB). Vui lòng dừng bớt dự án khác để tạo mới.`);
    }

    return this.projectsService.createProject(userId, createProjectDto.name);
  }

  @Get()
  async findAll(@Request() req: any) {
    const userId: number = req.user.id;
    this.logger.log(`GET /projects — Listing projects for user ${userId}`);
    return this.projectsService.findAll(userId);
  }

  @Get(':id')
  @RequirePermission('project:read')
  async findOne(@Param('id', ParseIntPipe) id: number) {
    this.logger.log(`GET /projects/${id}`);
    return this.projectsService.findOne(id);
  }

  @Get(':id/stats')
  @RequirePermission('project:read')
  async getStats(@Param('id', ParseIntPipe) id: number) {
    this.logger.log(`GET /projects/${id}/stats`);
    return this.projectsService.getProjectStats(id);
  }

  @Get(':id/stats/history')
  @RequirePermission('project:read')
  async getStatsHistory(@Param('id', ParseIntPipe) id: number) {
    return this.statsCollectorService.getStats(id, 24);
  }

  @Patch(':id')
  @RequirePermission('project:settings')
  async updateProject(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: { name?: string; autoScale?: boolean; notificationsEnabled?: boolean },
  ) {
    this.logger.log(`PATCH /projects/${id} — Updating project settings`);
    const updateData: any = {};
    if (body.name !== undefined) updateData.name = body.name;
    if (body.autoScale !== undefined) updateData.autoScale = body.autoScale;
    if (body.notificationsEnabled !== undefined) updateData.notificationsEnabled = body.notificationsEnabled;
    return this.prisma.project.update({
      where: { id },
      data: updateData,
    });
  }

  @Patch(':id/restart-policy')
  @RequirePermission('project:settings')
  async updateRestartPolicy(
    @Param('id', ParseIntPipe) id: number,
    @Body('restartPolicy') restartPolicy: string,
  ) {
    this.logger.log(`PATCH /projects/${id}/restart-policy — ${restartPolicy}`);
    return this.projectsService.updateRestartPolicy(id, restartPolicy);
  }

  @Patch(':id/start')
  @RequirePermission('project:start')
  async start(@Request() req: any, @Param('id', ParseIntPipe) id: number) {
    this.logger.log(`PATCH /projects/${id}/start`);
    
    // Check Quota RAM
    const requester = await this.prisma.user.findUnique({
      where: { id: req.user.id }
    });
    if (!requester) throw new ForbiddenException('Không tìm thấy tài khoản.');

    const adminId = requester.parentId || requester.id;
    const admin = await this.prisma.user.findUnique({
      where: { id: adminId }
    });
    if (!admin) throw new ForbiddenException('Không tìm thấy Admin quản lý.');

    const targetProject = await this.prisma.project.findUnique({ where: { id } });
    if (!targetProject) throw new NotFoundException('Dự án không tồn tại.');

    // Nếu dự án chưa chạy, kiểm tra xem việc khởi chạy có vượt quá Quota RAM hay không
    if (targetProject.status !== 'running') {
      const runningProjects = await this.prisma.project.findMany({
        where: {
          id: { not: id },
          status: 'running',
          OR: [
            { userId: adminId },
            { user: { parentId: adminId } }
          ]
        },
        select: { ramLimit: true }
      });
      const currentTotalRam = runningProjects.reduce((sum, p) => sum + p.ramLimit, 0);

      if (currentTotalRam + targetProject.ramLimit > admin.maxRam) {
        throw new BadRequestException(`Vượt quá giới hạn dung lượng RAM được cấp phát cho doanh nghiệp (Cấp phép tối đa: ${admin.maxRam} MB, Đang dùng: ${currentTotalRam} MB, Yêu cầu khởi chạy: ${targetProject.ramLimit} MB). Vui lòng dừng bớt dự án khác trước khi start.`);
      }
    }

    return this.projectsService.startProject(id);
  }

  @Patch(':id/stop')
  @RequirePermission('project:stop')
  async stop(@Param('id', ParseIntPipe) id: number) {
    this.logger.log(`PATCH /projects/${id}/stop`);
    return this.projectsService.stopProject(id);
  }

  @Patch(':id/restart')
  @RequirePermission('project:restart')
  async restart(@Param('id', ParseIntPipe) id: number) {
    this.logger.log(`PATCH /projects/${id}/restart`);
    return this.projectsService.restartProject(id);
  }

  @Patch(':id/hibernate')
  @RequirePermission('project:hibernate')
  async hibernate(@Param('id', ParseIntPipe) id: number) {
    this.logger.log(`PATCH /projects/${id}/hibernate`);
    return this.projectsService.hibernateProject(id);
  }

  @Patch(':id/ssl/activate')
  @RequirePermission('project:settings')
  async activateSsl(@Param('id', ParseIntPipe) id: number) {
    this.logger.log(`PATCH /projects/${id}/ssl/activate`);
    return this.projectsService.activateSsl(id);
  }

  @Patch(':id/domain')
  @RequirePermission('project:settings')
  async updateDomain(
    @Param('id', ParseIntPipe) id: number,
    @Body('customDomain') customDomain: string,
  ) {
    this.logger.log(`PATCH /projects/${id}/domain — ${customDomain}`);
    return this.projectsService.updateCustomDomain(id, customDomain);
  }

  @Patch(':id/settings')
  @RequirePermission('project:settings')
  async updateSettings(
    @Param('id', ParseIntPipe) id: number,
    @Body('volumeMapping') volumeMapping?: string,
    @Body('slackWebhook') slackWebhook?: string,
    @Body('alertInterval') alertInterval?: string | number,
  ) {
    const intervalNum = alertInterval !== undefined ? parseInt(alertInterval as any, 10) : undefined;
    this.logger.log(`PATCH /projects/${id}/settings — Volume=${volumeMapping}, Webhook=${slackWebhook}, Interval=${intervalNum}`);
    return this.projectsService.updateSettings(id, volumeMapping, slackWebhook, intervalNum);
  }

  @Post(':id/settings/test-alert')
  @RequirePermission('project:settings')
  async testAlert(@Param('id', ParseIntPipe) id: number) {
    this.logger.log(`POST /projects/${id}/settings/test-alert`);
    return this.projectsService.sendTestAlert(id);
  }

  @Post(':id/clone')
  @RequirePermission('project:settings')
  async clone(@Request() req: any, @Param('id', ParseIntPipe) id: number) {
    this.logger.log(`POST /projects/${id}/clone`);

    const requester = await this.prisma.user.findUnique({
      where: { id: req.user.id }
    });
    if (!requester) throw new ForbiddenException('Không tìm thấy tài khoản.');

    const adminId = requester.parentId || requester.id;
    const admin = await this.prisma.user.findUnique({
      where: { id: adminId }
    });
    if (!admin) throw new ForbiddenException('Không tìm thấy Admin quản lý.');

    // Kiểm tra giới hạn số lượng dự án (maxProjects)
    const tenantProjectsCount = await this.prisma.project.count({
      where: {
        OR: [
          { userId: adminId },
          { user: { parentId: adminId } }
        ]
      }
    });

    if (tenantProjectsCount >= admin.maxProjects) {
      throw new BadRequestException(`Doanh nghiệp của bạn đã vượt quá giới hạn số lượng dự án cho phép (Tối đa: ${admin.maxProjects} dự án). Vui lòng liên hệ Super Admin để nâng cấp.`);
    }

    return this.projectsService.cloneProject(id);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @RequirePermission('project:delete')
  async remove(@Param('id', ParseIntPipe) id: number) {
    this.logger.log(`DELETE /projects/${id}`);
    return this.projectsService.deleteProject(id);
  }

  @Get(':id/logs/download')
  @RequirePermission('project:read')
  async downloadLogs(@Param('id', ParseIntPipe) id: number) {
    this.logger.log(`GET /projects/${id}/logs/download`);
    const logs = await this.projectsService.getProjectLogs(id);
    const project = await this.projectsService.findOne(id);
    return {
      filename: `potato-${project.name.toLowerCase()}-logs.txt`,
      content: logs,
    };
  }

  // ─── Environment Variables ─────────────────────────────────────────────

  @Get(':id/env')
  @RequirePermission('env:read')
  async getEnvVariables(@Param('id', ParseIntPipe) id: number) {
    return this.projectsService.getEnvVariables(id);
  }

  @Post(':id/env')
  @RequirePermission('env:write')
  async addEnvVariable(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: CreateEnvVariableDto,
  ) {
    return this.projectsService.addEnvVariable(id, dto.key, dto.value, dto.isSecret ?? false);
  }

  @Patch(':id/env/:envId')
  @RequirePermission('env:write')
  async updateEnvVariable(
    @Param('id', ParseIntPipe) id: number,
    @Param('envId', ParseIntPipe) envId: number,
    @Body() dto: UpdateEnvVariableDto,
  ) {
    return this.projectsService.updateEnvVariable(id, envId, dto.value, dto.isSecret);
  }

  @Delete(':id/env/:envId')
  @RequirePermission('env:write')
  async deleteEnvVariable(
    @Param('id', ParseIntPipe) id: number,
    @Param('envId', ParseIntPipe) envId: number,
  ) {
    return this.projectsService.deleteEnvVariable(id, envId);
  }

  // ─── Resource Harvesting ──────────────────────────────────────────────

  @Patch(':id/resources')
  @RequirePermission('project:resources')
  async updateResources(
    @Request() req: any,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateResourcesDto,
  ) {
    this.logger.log(`PATCH /projects/${id}/resources — RAM=${dto.ramLimit}MB, CPU=${dto.cpuLimit}`);

    const requester = await this.prisma.user.findUnique({
      where: { id: req.user.id }
    });
    if (!requester) throw new ForbiddenException('Không tìm thấy tài khoản.');

    const adminId = requester.parentId || requester.id;
    const admin = await this.prisma.user.findUnique({
      where: { id: adminId }
    });
    if (!admin) throw new ForbiddenException('Không tìm thấy Admin quản lý.');

    const targetProject = await this.prisma.project.findUnique({ where: { id } });
    if (!targetProject) throw new NotFoundException('Dự án không tồn tại.');

    const newRamLimit = dto.ramLimit ?? 256;

    // Chỉ check Quota RAM khi dự án đang chạy (status === 'running')
    if (targetProject.status === 'running') {
      const runningProjects = await this.prisma.project.findMany({
        where: {
          id: { not: id },
          status: 'running',
          OR: [
            { userId: adminId },
            { user: { parentId: adminId } }
          ]
        },
        select: { ramLimit: true }
      });
      const currentTotalRam = runningProjects.reduce((sum, p) => sum + p.ramLimit, 0);

      if (currentTotalRam + newRamLimit > admin.maxRam) {
        throw new BadRequestException(`Vượt quá giới hạn dung lượng RAM được cấp phát cho doanh nghiệp (Cấp phép tối đa: ${admin.maxRam} MB, Đang dùng: ${currentTotalRam} MB, Yêu cầu mới: ${newRamLimit} MB). Vui lòng dừng bớt dự án khác trước khi nâng cấp.`);
      }
    }

    return this.projectsService.updateResources(id, newRamLimit, dto.cpuLimit ?? 1);
  }

  @Get(':id/activities')
  @RequirePermission('project:read')
  async getActivityLogs(@Param('id', ParseIntPipe) id: number) {
    return this.projectsService.getActivityLogs(id);
  }

  // ─── Project Lifecycle ───────────────────────────────────────────────────────

  @Post(':id/deploy')
  @RequirePermission('project:deploy')
  async deploy(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: GitDeployDto,
  ) {
    this.logger.log(`POST /projects/${id}/deploy — Repo: ${dto.gitRepo}`);
    return this.projectsService.deployFromGit(id, dto.gitRepo, dto.deployBranch ?? 'main', dto.gitToken);
  }

  // ─── Deployment History ────────────────────────────────────────────────

  @Get(':id/deployments')
  @RequirePermission('project:read')
  async getDeployments(@Param('id', ParseIntPipe) id: number) {
    return this.projectsService.getDeployments(id);
  }

  @Post(':id/rollback/:deploymentId')
  @RequirePermission('project:deploy')
  async rollback(
    @Param('id', ParseIntPipe) id: number,
    @Param('deploymentId', ParseIntPipe) deploymentId: number,
  ) {
    this.logger.log(`POST /projects/${id}/rollback/${deploymentId} — Triggering rollback`);
    return this.projectsService.rollbackProject(id, deploymentId);
  }

  // ─── Project Members ──────────────────────────────────────────────────

  /**
   * GET /api/projects/:id/members
   * Lấy danh sách thành viên trong dự án.
   * Chỉ yêu cầu quyền project:read.
   */
  @Get(':id/members')
  @RequirePermission('project:read')
  async getMembers(@Param('id', ParseIntPipe) id: number) {
    return this.projectsService.getProjectMembers(id);
  }

  /**
   * POST /api/projects/:id/members
   * Thêm thành viên mới vào dự án với vai trò cụ thể.
   * Chỉ cho phép tài khoản có quyền member:manage.
   */
  @Post(':id/members')
  @RequirePermission('member:manage')
  async addMember(
    @Param('id', ParseIntPipe) id: number,
    @Body('userId') memberUserId: number,
    @Body('role') role: ProjectRole,
    @Body('permissions') permissions: string[],
  ) {
    this.logger.log(`POST /projects/${id}/members — Add user ${memberUserId} as ${role}`);
    return this.projectsService.addProjectMember(id, memberUserId, role, permissions);
  }

  /**
   * PATCH /api/projects/:id/members/:memberId
   * Cập nhật vai trò của thành viên trong dự án.
   * Chỉ cho phép tài khoản có quyền member:manage.
   */
  @Patch(':id/members/:memberId')
  @RequirePermission('member:manage')
  async updateMember(
    @Param('id', ParseIntPipe) id: number,
    @Param('memberId', ParseIntPipe) memberId: number,
    @Body('role') role: ProjectRole,
  ) {
    this.logger.log(`PATCH /projects/${id}/members/${memberId} — Update role to ${role}`);
    return this.projectsService.updateProjectMember(id, memberId, role);
  }

  /**
   * DELETE /api/projects/:id/members/:memberId
   * Xóa thành viên khỏi dự án.
   * Chỉ cho phép tài khoản có quyền member:manage.
   */
  @Delete(':id/members/:memberId')
  @RequirePermission('member:manage')
  async deleteMember(
    @Param('id', ParseIntPipe) id: number,
    @Param('memberId', ParseIntPipe) memberId: number,
  ) {
    this.logger.log(`DELETE /projects/${id}/members/${memberId} — Remove member`);
    return this.projectsService.deleteProjectMember(id, memberId);
  }
}
