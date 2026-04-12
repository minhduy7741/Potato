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
} from '@nestjs/common';
import { ProjectsService } from './projects.service';
import { CreateProjectDto } from './dto/create-project.dto';
import { CreateEnvVariableDto } from './dto/create-env-variable.dto';
import { UpdateResourcesDto } from './dto/update-resources.dto';
import { GitDeployDto } from './dto/git-deploy.dto';

/**
 * ProjectsController — REST API endpoints for project container management.
 *
 * Base path: /api/projects
 */
@Controller('projects')
export class ProjectsController {
  private readonly logger = new Logger(ProjectsController.name);

  constructor(private readonly projectsService: ProjectsService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(@Body() createProjectDto: CreateProjectDto) {
    this.logger.log(`POST /projects — Creating "${createProjectDto.name}" for user ${createProjectDto.userId}`);
    return this.projectsService.createProject(createProjectDto.userId, createProjectDto.name);
  }

  @Get()
  async findAll() {
    this.logger.log('GET /projects — Listing all projects');
    return this.projectsService.findAll();
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

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  async remove(@Param('id', ParseIntPipe) id: number) {
    this.logger.log(`DELETE /projects/${id}`);
    return this.projectsService.deleteProject(id);
  }

  @Patch(':id/domain')
  async updateDomain(
    @Param('id', ParseIntPipe) id: number,
    @Body('customDomain') customDomain: string,
  ) {
    this.logger.log(`PATCH /projects/${id}/domain — Binding to "${customDomain}"`);
    return this.projectsService.updateDomain(id, customDomain);
  }

  @Patch(':id/ssl/enable')
  async enableSsl(@Param('id', ParseIntPipe) id: number) {
    this.logger.log(`PATCH /projects/${id}/ssl/enable`);
    return this.projectsService.enableHttps(id);
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

  // ─── Git Deploy ───────────────────────────────────────────────────────

  @Post(':id/deploy')
  async deploy(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: GitDeployDto,
  ) {
    this.logger.log(`POST /projects/${id}/deploy — Repo: ${dto.gitRepo}`);
    return this.projectsService.deployFromGit(id, dto.gitRepo, dto.deployBranch ?? 'main');
  }

  // ─── Deployment History ────────────────────────────────────────────────

  @Get(':id/deployments')
  async getDeployments(@Param('id', ParseIntPipe) id: number) {
    return this.projectsService.getDeployments(id);
  }
}
