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
} from '@nestjs/common';
import { ProjectsService } from './projects.service';
import { StatsCollectorService } from './stats-collector.service';
import { CreateProjectDto } from './dto/create-project.dto';
import { CreateEnvVariableDto } from './dto/create-env-variable.dto';
import { UpdateEnvVariableDto } from './dto/update-env-variable.dto';
import { UpdateResourcesDto } from './dto/update-resources.dto';
import { GitDeployDto } from './dto/git-deploy.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

/**
 * ProjectsController — REST API endpoints for project container management.
 *
 * Base path: /api/projects
 */
@Controller('projects')
@UseGuards(JwtAuthGuard)
export class ProjectsController {
  private readonly logger = new Logger(ProjectsController.name);

  constructor(
    private readonly projectsService: ProjectsService,
    private readonly statsCollectorService: StatsCollectorService,
  ) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(@Request() req: any, @Body() createProjectDto: CreateProjectDto) {
    const userId: number = req.user.id;
    this.logger.log(`POST /projects — Creating "${createProjectDto.name}" for user ${userId}`);
    return this.projectsService.createProject(userId, createProjectDto.name);
  }

  @Get()
  async findAll(@Request() req: any) {
    const userId: number = req.user.id;
    this.logger.log(`GET /projects — Listing projects for user ${userId}`);
    return this.projectsService.findAll(userId);
  }

  @Get(':id')
  async findOne(@Param('id', ParseIntPipe) id: number) {
    this.logger.log(`GET /projects/${id}`);
    return this.projectsService.findOne(id);
  }

  @Get(':id/stats')
  async getStats(@Param('id', ParseIntPipe) id: number) {
    this.logger.log(`GET /projects/${id}/stats`);
    return this.projectsService.getProjectStats(id);
  }

  @Get(':id/stats/history')
  async getStatsHistory(@Param('id', ParseIntPipe) id: number) {
    return this.statsCollectorService.getStats(id, 24);
  }

  @Patch(':id/restart-policy')
  async updateRestartPolicy(
    @Param('id', ParseIntPipe) id: number,
    @Body('restartPolicy') restartPolicy: string,
  ) {
    this.logger.log(`PATCH /projects/${id}/restart-policy — ${restartPolicy}`);
    return this.projectsService.updateRestartPolicy(id, restartPolicy);
  }

  @Patch(':id/start')
  async start(@Param('id', ParseIntPipe) id: number) {
    this.logger.log(`PATCH /projects/${id}/start`);
    return this.projectsService.startProject(id);
  }

  @Patch(':id/stop')
  async stop(@Param('id', ParseIntPipe) id: number) {
    this.logger.log(`PATCH /projects/${id}/stop`);
    return this.projectsService.stopProject(id);
  }

  @Patch(':id/restart')
  async restart(@Param('id', ParseIntPipe) id: number) {
    this.logger.log(`PATCH /projects/${id}/restart`);
    return this.projectsService.restartProject(id);
  }

  @Patch(':id/hibernate')
  async hibernate(@Param('id', ParseIntPipe) id: number) {
    this.logger.log(`PATCH /projects/${id}/hibernate`);
    return this.projectsService.hibernateProject(id);
  }

  @Patch(':id/ssl/activate')
  async activateSsl(@Param('id', ParseIntPipe) id: number) {
    this.logger.log(`PATCH /projects/${id}/ssl/activate`);
    return this.projectsService.activateSsl(id);
  }

  @Patch(':id/domain')
  async updateDomain(
    @Param('id', ParseIntPipe) id: number,
    @Body('customDomain') customDomain: string,
  ) {
    this.logger.log(`PATCH /projects/${id}/domain — ${customDomain}`);
    return this.projectsService.updateCustomDomain(id, customDomain);
  }

  @Post(':id/clone')
  async clone(@Param('id', ParseIntPipe) id: number) {
    this.logger.log(`POST /projects/${id}/clone`);
    return this.projectsService.cloneProject(id);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  async remove(@Param('id', ParseIntPipe) id: number) {
    this.logger.log(`DELETE /projects/${id}`);
    return this.projectsService.deleteProject(id);
  }


  @Get(':id/logs/download')
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
  async getEnvVariables(@Param('id', ParseIntPipe) id: number) {
    return this.projectsService.getEnvVariables(id);
  }

  @Post(':id/env')
  async addEnvVariable(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: CreateEnvVariableDto,
  ) {
    return this.projectsService.addEnvVariable(id, dto.key, dto.value, dto.isSecret ?? false);
  }

  @Patch(':id/env/:envId')
  async updateEnvVariable(
    @Param('id', ParseIntPipe) id: number,
    @Param('envId', ParseIntPipe) envId: number,
    @Body() dto: UpdateEnvVariableDto,
  ) {
    return this.projectsService.updateEnvVariable(id, envId, dto.value, dto.isSecret);
  }

  @Delete(':id/env/:envId')
  async deleteEnvVariable(
    @Param('id', ParseIntPipe) id: number,
    @Param('envId', ParseIntPipe) envId: number,
  ) {
    return this.projectsService.deleteEnvVariable(id, envId);
  }

  // ─── Resource Harvesting ──────────────────────────────────────────────

  @Patch(':id/resources')
  async updateResources(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateResourcesDto,
  ) {
    this.logger.log(`PATCH /projects/${id}/resources — RAM=${dto.ramLimit}MB, CPU=${dto.cpuLimit}`);
    return this.projectsService.updateResources(id, dto.ramLimit ?? 256, dto.cpuLimit ?? 1);
  }

  @Get(':id/activities')
  async getActivityLogs(@Param('id', ParseIntPipe) id: number) {
    return this.projectsService.getActivityLogs(id);
  }

  // ─── Project Lifecycle ───────────────────────────────────────────────────────

  @Post(':id/deploy')
  async deploy(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: GitDeployDto,
  ) {
    this.logger.log(`POST /projects/${id}/deploy — Repo: ${dto.gitRepo}`);
    return this.projectsService.deployFromGit(id, dto.gitRepo, dto.deployBranch ?? 'main', dto.gitToken);
  }

  // ─── Deployment History ────────────────────────────────────────────────

  @Get(':id/deployments')
  async getDeployments(@Param('id', ParseIntPipe) id: number) {
    return this.projectsService.getDeployments(id);
  }
}
