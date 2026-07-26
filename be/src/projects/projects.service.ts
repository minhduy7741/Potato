import {
  Injectable,
  Logger,
  NotFoundException,
  InternalServerErrorException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { randomBytes } from 'crypto';
import * as os from 'os';
import * as path from 'path';
import * as fs from 'fs';
import simpleGit from 'simple-git';
import * as tar from 'tar-fs';
import { PrismaService } from '../prisma/prisma.service';
import { ProjectRole } from '@prisma/client';
import { DockerService } from '../docker/docker.service';
import { NginxService } from '../infrastructure/nginx.service';
import { SslService } from '../infrastructure/ssl.service';
import { DatabasesService } from '../databases/databases.service';
import { encrypt, decrypt } from '../common/encryption.util';
import { Cron, CronExpression } from '@nestjs/schedule';

/** Port range for project containers */
const PORT_RANGE_MIN = 10000;
const PORT_RANGE_MAX = 19999;

/** Default Node.js image for project containers */
const DEFAULT_IMAGE = 'node:20-alpine';

/** Default RAM limit in MB */
const DEFAULT_RAM_LIMIT = 256;
const DEFAULT_CPU_LIMIT = 0.5;

@Injectable()
export class ProjectsService {
  private readonly logger = new Logger(ProjectsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly dockerService: DockerService,
    private readonly nginxService: NginxService,
    private readonly sslService: SslService,
    private readonly databasesService: DatabasesService,
  ) { }

  // ─── Create Project ──────────────────────────────────────────────────

  /**
   * Creates a new project with a Docker container.
   *
   * Flow:
   *   1. Generate a unique subdomain
   *   2. Pull the Node.js image
   *   3. Allocate a host port
   *   4. Create & start a Docker container with 256MB RAM limit
   *   5. Save to database with containerId
   *
   * @param userId - The owner's user ID
   * @param projectName - Display name for the project
   */
  async createProject(userId: number, projectName: string) {
    this.logger.log(`Creating project "${projectName}" for user ${userId}`);

    // Validate user exists
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });
    if (!user) {
      throw new NotFoundException(`User with ID ${userId} not found`);
    }

    // Generate a unique subdomain from the project name
    const shortId = randomBytes(4).toString('hex');
    const subdomain = `${projectName.toLowerCase().replace(/[^a-z0-9]/g, '-')}-${shortId}`;

    // Allocate a random host port
    const hostPort = await this.allocatePort();

    const project = await this.prisma.project.create({
      data: {
        name: projectName,
        status: 'sprouting',
        ramLimit: DEFAULT_RAM_LIMIT,
        subdomain,
        userId,
        hostPort,
      },
    });

    // Automatically add creator as LEADER
    await this.prisma.projectMember.create({
      data: {
        userId,
        projectId: project.id,
        role: 'LEADER',
        permissions: [
          'project:read', 'project:start', 'project:stop', 'project:restart', 
          'project:hibernate', 'project:delete', 'project:settings', 
          'project:resources', 'project:deploy', 'env:read', 'env:write', 
          'member:manage', 'database:manage'
        ],
      },
    });

    await this.logActivity(project.id, 'CREATE', `Project "${projectName}" initialized`);

    this.logger.log(`Project "${projectName}" initialized with ID ${project.id}. Starting background provisioning...`);

    // Launch background provisioning task (not awaited)
    this.provisionProjectBackground(project.id, projectName, subdomain, hostPort).catch(err => {
      this.logger.error(`Background provisioning failed for project ${project.id}: ${err.message}`);
    });

    return {
      ...project,
      port: hostPort,
      url: `http://localhost:${hostPort}`,
      proxyUrl: `http://${subdomain}.potato.local`,
    };
  }

  /**
   * Background task to provision Docker container and Nginx config.
   */
  private async provisionProjectBackground(projectId: number, projectName: string, subdomain: string, hostPort: number) {
    // Pull the Node.js image
    try {
      await this.dockerService.pullImage(DEFAULT_IMAGE);
    } catch (error) {
      this.logger.error(`Failed to pull image in background: ${error}`);
      await this.prisma.project.update({
        where: { id: projectId },
        data: { status: 'error' },
      });
      return;
    }

    // Create and start the container
    try {
      const containerName = `potato-${subdomain}`;
      const envs = await this.prisma.envVariable.findMany({ where: { projectId } });
      const envArray = envs.map(e => `${e.key}=${e.value}`);

      // Fetch restart policy from DB (may have been updated before provisioning)
      const projectData = await this.prisma.project.findUnique({ where: { id: projectId }, select: { restartPolicy: true } });
      const restartPolicyName = projectData?.restartPolicy ?? 'on-failure';

      const container = await this.dockerService.createContainer({
        Image: DEFAULT_IMAGE,
        name: containerName,
        WorkingDir: '/app',
        Env: envArray,
        Cmd: [
          'sh',
          '-c',
          `if [ -f package.json ]; then npm start; elif [ -f index.html ]; then npx -y serve -l 3000 .; else node -e "require('http').createServer((req, res) => { res.writeHead(200, { 'Content-Type': 'text/html' }); res.end('<h1>🥔 ${projectName} is sprouting!</h1><p>Potato project running on port 3000</p>'); }).listen(3000, () => console.log('🥔 Potato project server running on port 3000'));"; fi`,
        ],
        ExposedPorts: { '3000/tcp': {} },
        HostConfig: {
          NanoCPUs: Math.floor(DEFAULT_CPU_LIMIT * 1000000000),
          Memory: DEFAULT_RAM_LIMIT * 1024 * 1024,
          MemorySwap: DEFAULT_RAM_LIMIT * 1024 * 1024,
          PortBindings: {
            '3000/tcp': [{ HostPort: String(hostPort) }],
          },
          Binds: [
            `potato-nm-${projectId}:/app/node_modules`,
          ],
          RestartPolicy: { Name: restartPolicyName },
        } as any,
      });

      await this.dockerService.startContainer(container.id);
      await this.logActivity(projectId, 'START', 'Container started successfully');

      // Update database status to 'running'
      await this.prisma.project.update({
        where: { id: projectId },
        data: {
          containerId: container.id,
          status: 'running'
        },
      });

      this.logger.log(`Background provisioning complete for project ${projectId}. Container ${container.id.substring(0, 12)} is running.`);

      // Generate Nginx reverse-proxy config
      this.nginxService.generateProxyConfig(
        subdomain,
        hostPort,
        projectName,
      );
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      this.logger.error(`Failed to create container in background: ${msg}`);
      await this.prisma.project.update({
        where: { id: projectId },
        data: { status: 'error' },
      });
    }
  }

  // ─── Start / Stop ────────────────────────────────────────────────────

  /**
   * Starts a stopped project's container.
   */
  async startProject(projectId: number) {
    const project = await this.findProjectOrFail(projectId);

    if (!project.containerId) {
      throw new BadRequestException(
        `Project ${projectId} has no container assigned`,
      );
    }

    if (project.status === 'running') {
      throw new BadRequestException(
        `Project ${projectId} is already running`,
      );
    }

    try {
      await this.dockerService.startContainer(project.containerId);
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      throw new InternalServerErrorException(
        `Failed to start container: ${msg}`,
      );
    }

    await this.logActivity(projectId, 'START', 'Project started manually');

    return this.prisma.project.update({
      where: { id: projectId },
      data: { status: 'running' },
    });
  }

  /**
   * Stops a running project's container.
   */
  async stopProject(projectId: number) {
    const project = await this.findProjectOrFail(projectId);

    if (!project.containerId) {
      throw new BadRequestException(
        `Project ${projectId} has no container assigned`,
      );
    }

    if (project.status === 'stopped') {
      throw new BadRequestException(
        `Project ${projectId} is already stopped`,
      );
    }

    try {
      await this.dockerService.stopContainer(project.containerId);
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      throw new InternalServerErrorException(
        `Failed to stop container: ${msg}`,
      );
    }

    await this.logActivity(projectId, 'STOP', 'Project stopped manually');

    return this.prisma.project.update({
      where: { id: projectId },
      data: { status: 'stopped' },
    });
  }

  /**
   * Hibernates a project (stops container and scales down).
   */
  async hibernateProject(projectId: number) {
    const project = await this.findProjectOrFail(projectId);

    if (project.containerId) {
      try {
        await this.dockerService.stopContainer(project.containerId);
      } catch (error) {
        this.logger.warn(`Failed to stop container for hibernation: ${error}`);
      }
    }

    await this.logActivity(projectId, 'HIBERNATE', 'Project hibernated');

    return this.prisma.project.update({
      where: { id: projectId },
      data: { status: 'hibernated' },
    });
  }

  /**
   * Restarts a running project's container.
   */
  async restartProject(projectId: number) {
    const project = await this.findProjectOrFail(projectId);

    if (!project.containerId) {
      throw new BadRequestException(
        `Project ${projectId} has no container assigned`,
      );
    }

    try {
      await this.dockerService.restartContainer(project.containerId);
      await this.logActivity(projectId, 'RESTART', 'Project restarted successfully');
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      throw new InternalServerErrorException(
        `Failed to restart container: ${msg}`,
      );
    }

    return this.prisma.project.update({
      where: { id: projectId },
      data: { status: 'running' },
    });
  }

  /**
   * Clones an existing project including environment variables.
   */
  async cloneProject(projectId: number) {
    const original = await this.prisma.project.findUnique({
      where: { id: projectId },
      include: { envVariables: true },
    });

    if (!original) throw new NotFoundException(`Project ${projectId} not found`);

    const newName = `${original.name}-clone-${Date.now().toString().slice(-4)}`;
    const newSubdomain = `${newName.toLowerCase().replace(/[^a-z0-9]/g, '-')}-${Math.random().toString(36).substring(2, 7)}`;

    // 1. Create the new project record
    const hostPort = await this.allocatePort();
    const clonedProject = await this.prisma.project.create({
      data: {
        name: newName,
        subdomain: newSubdomain,
        userId: original.userId,
        status: 'sprouting',
        ramLimit: original.ramLimit,
        cpuLimit: original.cpuLimit,
        gitRepo: original.gitRepo,
        deployBranch: original.deployBranch,
        hostPort,
      },
    });

    // 2. Clone environment variables
    if (original.envVariables.length > 0) {
      await this.prisma.envVariable.createMany({
        data: original.envVariables.map(ev => ({
          projectId: clonedProject.id,
          key: ev.key,
          value: ev.value,
          isSecret: ev.isSecret,
        })),
      });
    }

    await this.logActivity(clonedProject.id, 'CLONE', `Project cloned from "${original.name}" (ID: ${projectId})`);

    // 3. Trigger provisioning in background
    this.provisionProjectBackground(clonedProject.id, newName, newSubdomain, hostPort).catch(err => {
      this.logger.error(`Background provisioning failed for cloned project ${clonedProject.id}: ${err.message}`);
    });

    return clonedProject;
  }
  /**
   * Updates the custom domain for a project.
   */
  async updateDomain(id: number, customDomain: string | null) {
    const project = await this.findProjectOrFail(id);

    // If domain is provided, check if it's already in use
    if (customDomain) {
      const existing = await this.prisma.project.findUnique({
        where: { customDomain },
      });
      if (existing && existing.id !== id) {
        throw new ConflictException(`Domain "${customDomain}" is already connected to another project`);
      }
    }

    const updated = await this.prisma.project.update({
      where: { id },
      data: { customDomain },
    });

    // Update Nginx configuration to reflect new domain
    this.nginxService.generateProxyConfig(
      project.subdomain,
      project.hostPort ?? 10000, // Sử dụng port thực tế của dự án từ database
      project.name,
      customDomain ?? undefined
    );

    return updated;
  }

  /**
   * Issues an SSL certificate and enables HTTPS for the project.
   */
  async enableHttps(id: number) {
    const project = await this.findProjectOrFail(id);

    // We can only issue SSL for valid domains (including subdomains)
    const domain = project.customDomain || `${project.subdomain}.potato.local`;

    await this.prisma.project.update({
      where: { id },
      data: { sslStatus: 'provisioning' },
    });

    try {
      const { expiry } = await this.sslService.issueCertificate(domain);

      const updated = await this.prisma.project.update({
        where: { id },
        data: {
          sslStatus: 'active',
          sslExpiry: expiry,
        },
      });

      // Update Nginx with SSL active
      this.nginxService.generateProxyConfig(
        project.subdomain,
        project.hostPort ?? 10000, // Sử dụng port thực tế của dự án từ database
        project.name,
        project.customDomain ?? undefined,
        true // sslActive
      );

      return updated;
    } catch (error) {
      await this.prisma.project.update({
        where: { id },
        data: { sslStatus: 'error' },
      });
      throw new InternalServerErrorException(`SSL Provisioning failed: ${error.message}`);
    }
  }

  // ─── Delete ──────────────────────────────────────────────────────────

  /**
   * Deletes a project and its Docker container.
   */
  async deleteProject(projectId: number) {
    const project = await this.findProjectOrFail(projectId);

    // 1. Clean up associated databases (Sprouts)
    const dbs = await this.prisma.databaseInstance.findMany({
      where: { projectId },
    });

    for (const db of dbs) {
      try {
        await this.databasesService.remove(db.id);
        this.logger.log(`Cleaned up database ${db.id} for deleted project ${projectId}`);
      } catch (err) {
        this.logger.warn(`Failed to clean up database ${db.id} during project deletion: ${err.message}`);
      }
    }

    // 2. Remove Docker container if it exists
    if (project.containerId) {
      try {
        await this.dockerService.removeContainer(project.containerId);
      } catch (error) {
        this.logger.warn(
          `Failed to remove container ${project.containerId}: ${error}`,
        );
      }
    }

    // 2.5 Remove Docker image if it exists
    try {
      const imageName = `potato-app-${projectId}:latest`;
      await this.dockerService.removeImage(imageName);
    } catch (error) {
      this.logger.warn(`Failed to clean up image for project ${projectId}: ${error}`);
    }

    // 2.6 Remove host volume directory
    try {
      const hostVolumeDir = path.resolve(path.join(process.cwd(), 'uploads', 'volumes', `project-${projectId}`));
      if (fs.existsSync(hostVolumeDir)) {
        fs.rmSync(hostVolumeDir, { recursive: true, force: true });
        this.logger.log(`Cleaned up host volume directory for project ${projectId}: ${hostVolumeDir}`);
      }
    } catch (error) {
      this.logger.warn(`Failed to clean up host volume directory for project ${projectId}: ${error}`);
    }

    // Clean up attached databases and their containers to avoid FK constraint error
    const attachedDbs = await this.prisma.databaseInstance.findMany({
      where: { projectId: projectId }
    });

    for (const db of attachedDbs) {
      try {
        const containers = await this.dockerService.listContainers({
          filters: `{"label": ["potato.db_id=${db.id}"]}`,
          all: true,
        });
        for (const c of containers) {
          const container = this.dockerService.getContainer(c.Id);
          await container.remove({ force: true }).catch(() => { });
        }
        await this.prisma.databaseInstance.delete({ where: { id: db.id } });
      } catch (err) {
        this.logger.warn(`Lỗi khi dọn dẹp database ${db.id} của project ${projectId}: ${err}`);
      }
    }

    // Remove Nginx proxy config
    this.nginxService.removeProxyConfig(project.subdomain);

    await this.prisma.project.delete({ where: { id: projectId } });
    this.logger.log(`Project ${projectId} deleted`);

    return { message: `Project ${projectId} deleted successfully` };
  }

  // ─── Stats ───────────────────────────────────────────────────────────

  /**
   * Returns real-time CPU/RAM usage for a project's container.
   */
  async getProjectStats(projectId: number) {
    const project = await this.findProjectOrFail(projectId);

    if (!project.containerId) {
      throw new BadRequestException(
        `Project ${projectId} has no container assigned`,
      );
    }

    try {
      const [stats, state] = await Promise.all([
        this.dockerService.getContainerStats(project.containerId),
        this.dockerService.getContainerState(project.containerId),
      ]);

      return {
        projectId: project.id,
        projectName: project.name,
        containerId: project.containerId,
        state: state.status,
        running: state.running,
        cpu: {
          usagePercent: stats.cpuPercent,
        },
        memory: {
          usageMB: stats.memoryUsageMB,
          limitMB: stats.memoryLimitMB,
          usagePercent: stats.memoryPercent,
        },
      };
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      throw new InternalServerErrorException(
        `Failed to get container stats: ${msg}`,
      );
    }
  }

  // ─── Query ───────────────────────────────────────────────────────────

  /**
   * Returns all projects, optionally filtered by userId.
   */
  async findAll(userId?: number) {
    const ALL_ACTIONS = [
      'project:read', 'project:start', 'project:stop', 'project:restart', 
      'project:hibernate', 'project:delete', 'project:settings', 
      'project:resources', 'project:deploy', 'env:read', 'env:write', 
      'member:manage', 'database:manage'
    ];

    if (userId) {
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        include: { customRole: true },
      });
      if (user) {
        const isSuperAdmin = user.role === 'ADMIN' && user.email === 'superadmin@potato.com';
        const isTenantAdmin = user.role === 'ADMIN' && user.email !== 'superadmin@potato.com';
        const hasGlobalRead = user.customRole?.permissions?.includes('project:read');

        if (isSuperAdmin || hasGlobalRead) {
          // Super Admin và các vai trò có quyền project:read toàn cục nhìn thấy tất cả các dự án
          const projects = await this.prisma.project.findMany({
            include: { databases: true, members: true },
            orderBy: { createdAt: 'desc' },
          });
          return projects.map(p => ({
            ...p,
            memberRole: isSuperAdmin ? 'LEADER' : 'MEMBER',
            memberPermissions: isSuperAdmin ? ALL_ACTIONS : (user.customRole?.permissions || []),
          }));
        } else if (isTenantAdmin) {
          // Admin doanh nghiệp nhìn thấy tất cả dự án thuộc doanh nghiệp của mình (của mình hoặc nhân viên)
          const projects = await this.prisma.project.findMany({
            where: {
              OR: [
                { userId },
                { user: { parentId: userId } }
              ]
            },
            include: { databases: true, members: true },
            orderBy: { createdAt: 'desc' },
          });
          return projects.map(p => ({
            ...p,
            memberRole: 'LEADER',
            memberPermissions: ALL_ACTIONS,
          }));
        } else {
          // DEVELOPER chỉ nhìn thấy dự án mà họ là thành viên
          const memberships = await this.prisma.projectMember.findMany({
            where: { userId },
            include: {
              project: {
                include: { databases: true },
              },
              user: {
                include: { customRole: true },
              },
            },
          });

          return memberships.map(m => {
            const p = m.project;
            let perms = m.permissions || [];
            if (m.role === 'LEADER') {
              perms = ALL_ACTIONS;
            } else {
              // Hợp nhất quyền dự án với quyền Custom Role toàn cục
              const globalPerms = m.user?.customRole?.permissions || [];
              perms = Array.from(new Set([...perms, ...globalPerms]));
            }
            return {
              ...p,
              memberRole: m.role,
              memberPermissions: perms,
            };
          });
        }
      }
    }

    return this.prisma.project.findMany({
      include: { databases: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Thêm hoặc cập nhật vai trò/quyền của thành viên trong dự án.
   */
  async addProjectMember(projectId: number, userId: number, role: ProjectRole, permissions: string[]) {
    const project = await this.findProjectOrFail(projectId);
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('Người dùng không tồn tại.');

    const existing = await this.prisma.projectMember.findUnique({
      where: {
        userId_projectId: { userId, projectId },
      },
    });

    const ALL_ACTIONS = [
      'project:read', 'project:start', 'project:stop', 'project:restart', 
      'project:hibernate', 'project:delete', 'project:settings', 
      'project:resources', 'project:deploy', 'env:read', 'env:write', 
      'member:manage', 'database:manage'
    ];

    const finalPermissions = permissions || (role === 'LEADER' ? ALL_ACTIONS : ['project:read']);

    if (existing) {
      return this.prisma.projectMember.update({
        where: { id: existing.id },
        data: { role, permissions: finalPermissions },
      });
    }

    return this.prisma.projectMember.create({
      data: {
        userId,
        projectId,
        role,
        permissions: finalPermissions,
      },
    });
  }

  /**
   * Lấy danh sách thành viên dự án
   */
  async getProjectMembers(projectId: number) {
    await this.findProjectOrFail(projectId);
    return this.prisma.projectMember.findMany({
      where: { projectId },
      include: {
        user: {
          select: { id: true, name: true, email: true }
        }
      },
      orderBy: { createdAt: 'asc' }
    });
  }

  /**
   * Cập nhật vai trò thành viên dự án
   */
  async updateProjectMember(projectId: number, memberId: number, role: ProjectRole) {
    const member = await this.prisma.projectMember.findUnique({ where: { id: memberId } });
    if (!member || member.projectId !== projectId) {
      throw new NotFoundException('Không tìm thấy thành viên trong dự án.');
    }
    return this.prisma.projectMember.update({
      where: { id: memberId },
      data: { role },
    });
  }

  /**
   * Xóa thành viên khỏi dự án
   */
  async deleteProjectMember(projectId: number, memberId: number) {
    const member = await this.prisma.projectMember.findUnique({ where: { id: memberId } });
    if (!member || member.projectId !== projectId) {
      throw new NotFoundException('Không tìm thấy thành viên trong dự án.');
    }
    return this.prisma.projectMember.delete({ where: { id: memberId } });
  }

  /**
   * Returns a single project by ID.
   */
  async findOne(projectId: number) {
    return this.findProjectOrFail(projectId);
  }

  // ─── Environment Variables ───────────────────────────────────────────

  async getEnvVariables(projectId: number) {
    await this.findProjectOrFail(projectId);
    const envs = await this.prisma.envVariable.findMany({
      where: { projectId },
      orderBy: { createdAt: 'asc' },
    });
    return envs.map(e => ({
      ...e,
      value: e.isSecret ? decrypt(e.value) : e.value
    }));
  }

  async addEnvVariable(projectId: number, key: string, value: string, isSecret: boolean) {
    const project = await this.findProjectOrFail(projectId);
    const existing = await this.prisma.envVariable.findFirst({
      where: { projectId, key },
    });

    const encryptedValue = isSecret ? encrypt(value) : value;

    let result;
    if (existing) {
      result = await this.prisma.envVariable.update({
        where: { id: existing.id },
        data: { value: encryptedValue, isSecret },
      });
    } else {
      result = await this.prisma.envVariable.create({
        data: { key, value: encryptedValue, isSecret, projectId },
      });
    }

    // Trigger restart to apply new env vars
    if (project.containerId) {
      this.logger.log(`Restarting project ${projectId} to apply environment changes...`);
      this.restartProject(projectId).catch(err => {
        this.logger.error(`Failed to restart project for env change: ${err.message}`);
      });
    }

    return result;
  }

  async updateEnvVariable(projectId: number, envId: number, value?: string, isSecret?: boolean) {
    const project = await this.findProjectOrFail(projectId);
    const env = await this.prisma.envVariable.findFirst({ where: { id: envId, projectId } });
    if (!env) throw new NotFoundException('Environment variable not found');

    const data: any = {};
    if (isSecret !== undefined) data.isSecret = isSecret;
    if (value !== undefined) {
      const activeSecret = isSecret !== undefined ? isSecret : env.isSecret;
      data.value = activeSecret ? encrypt(value) : value;
    } else if (isSecret !== undefined) {
      const currentValue = env.isSecret ? decrypt(env.value) : env.value;
      data.value = isSecret ? encrypt(currentValue) : currentValue;
    }

    const result = await this.prisma.envVariable.update({
      where: { id: envId },
      data,
    });

    if (project.containerId) {
      this.logger.log(`Restarting project ${projectId} to apply environment changes...`);
      this.restartProject(projectId).catch(err => {
        this.logger.error(`Failed to restart project for env change: ${err.message}`);
      });
    }

    return result;
  }

  async deleteEnvVariable(projectId: number, envId: number) {
    const project = await this.findProjectOrFail(projectId);
    const result = await this.prisma.envVariable.delete({ where: { id: envId } });

    // Trigger restart to apply changes
    if (project.containerId) {
      this.restartProject(projectId).catch(err => {
        this.logger.error(`Failed to restart project for env deletion: ${err.message}`);
      });
    }

    return result;
  }

  // ─── Resource Harvesting ─────────────────────────────────────────────

  async updateResources(projectId: number, ramMB: number, cpuCores: number) {
    const project = await this.findProjectOrFail(projectId);

    if (project.containerId) {
      try {
        await this.dockerService.updateContainerResources(project.containerId, {
          cpuCores,
          ramMB,
        });
        await this.logActivity(projectId, 'UPDATE_RESOURCES', `Resources updated: RAM ${ramMB}MB, CPU ${cpuCores} cores`);
        this.logger.log(`Updated resources for container ${project.containerId.substring(0, 12)}: RAM=${ramMB}MB, CPU=${cpuCores} cores`);
      } catch (error) {
        const msg = error instanceof Error ? error.message : String(error);
        this.logger.warn(`Could not update live container resources: ${msg}`);
      }
    }

    return this.prisma.project.update({
      where: { id: projectId },
      data: { ramLimit: ramMB, cpuLimit: cpuCores },
    });
  }

  async activateSsl(projectId: number) {
    const project = await this.findProjectOrFail(projectId);
    const domain = project.customDomain || `${project.subdomain}.potato.local`;

    try {
      const { expiry } = await this.sslService.issueCertificate(domain);

      const updated = await this.prisma.project.update({
        where: { id: projectId },
        data: {
          sslStatus: 'active',
          sslExpiry: expiry,
        },
      });

      // Update Nginx config to use SSL
      this.nginxService.generateProxyConfig(
        project.subdomain,
        project.hostPort || 10000,
        project.name,
        project.customDomain || undefined,
        true,
      );

      await this.logActivity(projectId, 'ACTIVATE_SSL', `SSL activated for domain: ${domain}`);
      return updated;
    } catch (error) {
      this.logger.error(`Failed to activate SSL for project ${projectId}: ${error.message}`);
      throw error;
    }
  }

  async updateCustomDomain(projectId: number, customDomain: string) {
    const project = await this.findProjectOrFail(projectId);

    const updated = await this.prisma.project.update({
      where: { id: projectId },
      data: { customDomain },
    });

    // Regenerate Nginx config with the new domain
    this.nginxService.generateProxyConfig(
      project.subdomain,
      project.hostPort || 10000,
      project.name,
      customDomain || undefined,
      project.sslStatus === 'active',
    );

    await this.logActivity(projectId, 'UPDATE_DOMAIN', `Custom domain updated to: ${customDomain || 'none'}`);
    return updated;
  }

  // ─── Git Deploy ──────────────────────────────────────────────────────

  async deployFromGit(projectId: number, gitRepo: string, branch: string = 'main', gitToken?: string) {
    const project = await this.findProjectOrFail(projectId);

    // Save git settings to project
    await this.prisma.project.update({
      where: { id: projectId },
      data: { gitRepo, deployBranch: branch, gitToken, deployStatus: 'deploying' },
    });

    // Create deployment log entry
    const deployment = await this.prisma.deploymentLog.create({
      data: { projectId, status: 'running', trigger: 'manual' },
    });

    // Launch background deploy task
    this.runGitDeployBackground(project, deployment.id, gitRepo, branch).catch(err => {
      this.logger.error(`Git deploy failed for project ${projectId}: ${err.message}`);
    });

    await this.logActivity(projectId, 'DEPLOY', `Git deployment triggered (branch: ${branch})`);

    return { deploymentId: deployment.id, status: 'deploying', message: 'Deployment started in background' };
  }

  private async runGitDeployBackground(
    project: any,
    deploymentId: number,
    gitRepo: string,
    branch: string,
  ) {
    const startTime = Date.now();
    const tmpDir = path.join(os.tmpdir(), `potato-deploy-${project.id}-${Date.now()}`);
    let logBuffer = '';

    const updateLog = async (msg: string) => {
      this.logger.log(`[Deploy ${deploymentId}] ${msg}`);
      logBuffer += `${new Date().toISOString()} ${msg}\n`;
      // Update DB periodically to show progress
      await this.prisma.deploymentLog.update({
        where: { id: deploymentId },
        data: { log: logBuffer },
      }).catch(() => { }); // Ignore minor update fails
    };

    try {
      // ── Host Resource Check (Chống Overcommit) ──
      const freeRamBytes = os.freemem();
      const totalRamBytes = os.totalmem();
      const requiredRamBytes = project.ramLimit * 1024 * 1024;
      const minReservedRam = totalRamBytes * 0.05; // 5% reserve

      if (freeRamBytes < requiredRamBytes || (freeRamBytes - requiredRamBytes) < minReservedRam) {
        const freeRamMB = Math.round(freeRamBytes / (1024 * 1024));
        throw new Error(`Hệ thống không đủ tài nguyên trống. RAM khả dụng hiện tại: ${freeRamMB}MB, yêu cầu: ${project.ramLimit}MB (cần chừa lại tối thiểu 5% RAM hệ thống để chạy ổn định). Vui lòng nâng cấp máy chủ hoặc tắt bớt dự án khác.`);
      }

      let hostPort = project.hostPort;
      if (!hostPort) {
        hostPort = await this.allocatePort();
        await this.prisma.project.update({
          where: { id: project.id },
          data: { hostPort },
        });
        project.hostPort = hostPort;
      }

      const containerName = `potato-${project.subdomain}`;
      const imageName = `potato-app-${project.id}:dep-${deploymentId}`;

      await updateLog(`Gieo mầm: Bắt đầu clone ${gitRepo} (branch: ${branch})...`);
      fs.mkdirSync(tmpDir, { recursive: true });

      let cloned = false;
      for (let attempt = 1; attempt <= 3 && !cloned; attempt++) {
        try {
          if (fs.existsSync(tmpDir)) {
            fs.rmSync(tmpDir, { recursive: true, force: true });
          }
          fs.mkdirSync(tmpDir, { recursive: true });

          const projectData = await this.prisma.project.findUnique({ where: { id: project.id } });
          let cloneUrl = gitRepo;
          if (projectData?.gitToken && cloneUrl.startsWith('https://')) {
            cloneUrl = `https://${projectData.gitToken}@${cloneUrl.substring(8)}`;
          }

          const git = simpleGit();
          await git.clone(cloneUrl, tmpDir, [
            '--depth=1', '--branch', branch, '--single-branch',
            '-c', 'http.postBuffer=104857600', '-c', 'core.compression=0'
          ]);
          cloned = true;
        } catch (err: any) {
          if (attempt === 3) throw err;
          await updateLog(`Lỗi clone (lần ${attempt}): ${err.message}. Đang thử lại sau 5s...`);
          await new Promise(r => setTimeout(r, 5000));
        }
      }

      const repoGit = simpleGit(tmpDir);
      const logResult = await repoGit.log(['-1']);
      const latestCommit = logResult.latest;
      await updateLog(`Đã lấy mã nguồn thành công. Commit: ${latestCommit?.hash?.substring(0, 7)}`);

      // ── Auto Env Configuration ──
      const envPath = path.join(tmpDir, '.env');
      const envExamplePath = path.join(tmpDir, '.env.example');
      
      let existingEnvs = await this.prisma.envVariable.findMany({ where: { projectId: project.id } });
      const existingKeys = new Set(existingEnvs.map(e => e.key));
      let newlyAdded = 0;

      if (!fs.existsSync(envPath) && fs.existsSync(envExamplePath)) {
        await updateLog('Phát hiện file .env.example, đang tự động nạp các cấu hình mặc định...');
        const exampleContent = fs.readFileSync(envExamplePath, 'utf8');
        const lines = exampleContent.split('\n');
        
        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed || trimmed.startsWith('#')) continue;
          
          const eqIdx = trimmed.indexOf('=');
          if (eqIdx === -1) continue;
          
          const key = trimmed.substring(0, eqIdx).trim().toUpperCase();
          let value = trimmed.substring(eqIdx + 1).trim();
          
          if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
            value = value.substring(1, value.length - 1);
          }
          
          if (key && !existingKeys.has(key)) {
            if (key === 'APP_ENV') value = 'production';
            if (key === 'APP_DEBUG') value = 'false';
            if (key === 'DB_HOST') value = 'host.docker.internal';
            if (key === 'APP_KEY' && (!value || value === '')) {
              const crypto = require('crypto');
              value = 'base64:' + crypto.randomBytes(32).toString('base64');
            }
            
            await this.prisma.envVariable.create({
              data: { projectId: project.id, key, value, isSecret: false }
            });
            existingKeys.add(key);
            newlyAdded++;
          }
        }
        
        if (newlyAdded > 0) {
          await updateLog(`Đã tự động nạp ${newlyAdded} biến môi trường từ .env.example!`);
        }
      }

      // ── Language Detection & Dockerfile Generation ──
      await updateLog('Đang nhận diện ngôn ngữ dự án...');
      const hasDockerfile = fs.existsSync(path.join(tmpDir, 'Dockerfile'));
      
      let detectedLang = 'custom';
      if (!hasDockerfile) {
        if (fs.existsSync(path.join(tmpDir, 'composer.json'))) {
          detectedLang = 'php-laravel';
          await updateLog('Phát hiện PHP/Laravel (composer.json). Đang tạo cấu hình Docker...');
          
          // Ensure Laravel storage directories exist in source before building/copying
          fs.mkdirSync(path.join(tmpDir, 'storage', 'framework', 'views'), { recursive: true });
          fs.mkdirSync(path.join(tmpDir, 'storage', 'framework', 'cache', 'data'), { recursive: true });
          fs.mkdirSync(path.join(tmpDir, 'storage', 'framework', 'sessions'), { recursive: true });
          fs.mkdirSync(path.join(tmpDir, 'storage', 'logs'), { recursive: true });
          fs.mkdirSync(path.join(tmpDir, 'bootstrap', 'cache'), { recursive: true });

          fs.writeFileSync(path.join(tmpDir, 'Dockerfile'), `
FROM webdevops/php-nginx:8.2
ENV WEB_DOCUMENT_ROOT=/app/public
ENV WEB_DOCUMENT_INDEX=index.php
WORKDIR /app
COPY . .
RUN mkdir -p storage/framework/views storage/framework/cache/data storage/framework/sessions bootstrap/cache
RUN chown -R application:application /app && chmod -R 755 /app
RUN composer install --no-interaction --optimize-autoloader --no-dev || true
RUN chmod -R 777 storage bootstrap/cache || true
EXPOSE 80
          `.trim());
        } else if (fs.existsSync(path.join(tmpDir, 'package.json'))) {
          detectedLang = 'nodejs';
          await updateLog('Phát hiện Node.js (package.json). Đang cấu hình Docker tối ưu...');

          let packageJson: any = {};
          try {
            packageJson = JSON.parse(fs.readFileSync(path.join(tmpDir, 'package.json'), 'utf8'));
          } catch (e) {}

          const hasBuildScript = packageJson.scripts && packageJson.scripts.build;
          const hasStartScript = packageJson.scripts && packageJson.scripts.start;

          const hasYarn = fs.existsSync(path.join(tmpDir, 'yarn.lock'));
          const hasPnpm = fs.existsSync(path.join(tmpDir, 'pnpm-lock.yaml'));
          const hasBun = fs.existsSync(path.join(tmpDir, 'bun.lockb')) || fs.existsSync(path.join(tmpDir, 'bun.lock'));

          let baseImage = 'node:20-alpine';
          let installCmd = 'npm install';
          let buildCmd = 'npm run build';
          let startCmd = 'npm start';

          if (hasBun) {
            baseImage = 'oven/bun:1-alpine';
            installCmd = 'bun install';
            buildCmd = 'bun run build';
            startCmd = 'bun start';
            await updateLog('-> Phát hiện Bun lockfile. Sử dụng Bun Runtime.');
          } else if (hasPnpm) {
            baseImage = 'node:20-alpine';
            installCmd = 'npm install -g pnpm && pnpm install';
            buildCmd = 'pnpm build';
            startCmd = 'pnpm start';
            await updateLog('-> Phát hiện PNPM lockfile. Sử dụng PNPM Package Manager.');
          } else if (hasYarn) {
            baseImage = 'node:20-alpine';
            installCmd = 'yarn install';
            buildCmd = 'yarn build';
            startCmd = 'yarn start';
            await updateLog('-> Phát hiện Yarn lockfile. Sử dụng Yarn Package Manager.');
          } else {
            await updateLog('-> Sử dụng NPM Package Manager.');
          }

          let dockerfileContent = `
FROM ${baseImage}
WORKDIR /app
`.trim();

          if (hasBun) {
            dockerfileContent += `\nCOPY package.json bun.lockb* bun.lock* ./\n`;
          } else if (hasPnpm) {
            dockerfileContent += `\nCOPY package.json pnpm-lock.yaml* ./\n`;
          } else if (hasYarn) {
            dockerfileContent += `\nCOPY package.json yarn.lock* ./\n`;
          } else {
            dockerfileContent += `\nCOPY package*.json ./\n`;
          }

          dockerfileContent += `RUN ${installCmd}\nCOPY . .\n`;

          if (hasBuildScript) {
            await updateLog('-> Phát hiện build script. Thêm bước RUN build biên dịch.');
            dockerfileContent += `RUN ${buildCmd}\n`;
          }

          dockerfileContent += `RUN chmod -R 755 /app\nEXPOSE 3000\n`;

          if (hasStartScript) {
            dockerfileContent += `CMD [${startCmd.split(' ').map(s => `"${s}"`).join(', ')}]\n`;
          } else {
            const mainFile = packageJson.main || 'index.js';
            dockerfileContent += `CMD ["node", "${mainFile}"]\n`;
          }

          fs.writeFileSync(path.join(tmpDir, 'Dockerfile'), dockerfileContent.trim());
        } else if (fs.existsSync(path.join(tmpDir, 'requirements.txt'))) {
          detectedLang = 'python';
          await updateLog('Phát hiện Python (requirements.txt). Đang tạo cấu hình Docker...');
          fs.writeFileSync(path.join(tmpDir, 'Dockerfile'), `
FROM python:3.11-slim
WORKDIR /app
COPY requirements.txt .
RUN pip install -r requirements.txt
COPY . .
RUN chmod -R 755 /app
EXPOSE 8000
CMD ["python", "main.py"] 
          `.trim());
        } else {
          detectedLang = 'static-html';
          await updateLog('Không tìm thấy file cấu hình, mặc định coi là Web tĩnh (Static HTML). Đang tạo cấu hình Docker...');
          fs.writeFileSync(path.join(tmpDir, 'Dockerfile'), `
FROM nginx:alpine
COPY . /usr/share/nginx/html
RUN chmod -R 755 /usr/share/nginx/html
EXPOSE 80
          `.trim());
        }
      } else {
        await updateLog('Phát hiện Dockerfile do người dùng tự cung cấp.');
      }

      // Build Image
      await updateLog(`Đang Build Image (Loại: ${detectedLang}). Việc này có thể mất vài phút...`);
      await this.dockerService.buildImage(tmpDir, imageName, (msg) => {
        if (msg.startsWith('Step') || msg.toLowerCase().includes('error')) {
          updateLog(msg);
        }
      });
      await updateLog('Build Image thành công!');
      // Tag as latest as well
      await this.dockerService.tagImage(imageName, `potato-app-${project.id}`, 'latest');

      const hasOldContainer = !!project.containerId;
      let newHostPort = hostPort;
      let newContainerName = containerName;

      if (hasOldContainer) {
        newHostPort = await this.allocatePort();
        newContainerName = `potato-${project.subdomain}-temp-${Date.now()}`;
      }

      await updateLog('Đang tạo chậu mới từ Image vừa build...');
      const finalEnvs = await this.prisma.envVariable.findMany({ where: { projectId: project.id } });
      const envArray = finalEnvs.map(e => `${e.key}=${e.isSecret ? decrypt(e.value) : e.value}`);

      let targetPort = '3000';
      if (detectedLang === 'php-laravel' || detectedLang === 'static-html') targetPort = '80';
      else if (detectedLang === 'python') targetPort = '8000';
      else if (detectedLang === 'custom') {
        try {
          const imageInfo = await this.dockerService.inspectImage(imageName);
          if (imageInfo.Config?.ExposedPorts) {
            const ports = Object.keys(imageInfo.Config.ExposedPorts);
            if (ports.length > 0) {
              targetPort = ports[0].split('/')[0];
            }
          }
        } catch (e) {
          this.logger.warn(`Failed to inspect custom image to find port: ${e}`);
        }
      }

      const portBindings: any = {};
      portBindings[`${targetPort}/tcp`] = [{ HostPort: String(newHostPort) }];
      if (detectedLang === 'custom') {
        portBindings['3000/tcp'] = [{ HostPort: String(newHostPort) }];
        portBindings['80/tcp'] = [{ HostPort: String(newHostPort) }];
        portBindings['8080/tcp'] = [{ HostPort: String(newHostPort) }];
        portBindings['8000/tcp'] = [{ HostPort: String(newHostPort) }];
      }

      // Setup Persistent Volume
      const hostVolumeDir = path.resolve(path.join(process.cwd(), 'uploads', 'volumes', `project-${project.id}`));
      fs.mkdirSync(hostVolumeDir, { recursive: true });
      const containerVolumePath = project.volumeMapping || '/app/storage';

      // Copy initial files to host volume directory if they exist in source and host volume is empty/doesn't have files
      const relPath = containerVolumePath.startsWith('/app/') 
        ? containerVolumePath.substring(5) 
        : containerVolumePath.startsWith('/app')
        ? containerVolumePath.substring(4)
        : '';
      
      if (relPath) {
        const srcVolumeDir = path.join(tmpDir, relPath);
        if (fs.existsSync(srcVolumeDir)) {
          const hostFiles = fs.readdirSync(hostVolumeDir);
          const hasFramework = fs.existsSync(path.join(hostVolumeDir, 'framework'));
          const isEmpty = hostFiles.length === 0 || 
            (hostFiles.length === 1 && hostFiles[0] === 'logs') ||
            !hasFramework;
          
          if (isEmpty) {
            await updateLog(`Đang khởi tạo dữ liệu volume trên máy Host từ ${relPath}...`);
            try {
              fs.cpSync(srcVolumeDir, hostVolumeDir, { recursive: true });
            } catch (err: any) {
              this.logger.warn(`Could not initialize host volume directory: ${err.message}`);
            }
          }
        }
      }

      const container = await this.dockerService.createContainer({
        Image: imageName,
        name: newContainerName,
        Env: envArray,
        ExposedPorts: { [`${targetPort}/tcp`]: {} },
        HostConfig: {
          Memory: project.ramLimit * 1024 * 1024,
          MemorySwap: project.ramLimit * 1024 * 1024,
          NanoCPUs: Math.floor(project.cpuLimit * 1000000000),
          PortBindings: portBindings,
          Binds: [`${hostVolumeDir}:${containerVolumePath}`],
          RestartPolicy: { Name: 'unless-stopped' },
        } as any,
      });

      await this.dockerService.startContainer(container.id);

      // ── Health Check (Zero-downtime) ──
      await updateLog('Đang kiểm tra trạng thái hoạt động của container mới...');
      let isHealthy = false;
      const http = require('http');

      for (let i = 0; i < 15; i++) {
        const checkPromise = new Promise<boolean>((resolve) => {
          const req = http.get(`http://localhost:${newHostPort}`, (res: any) => {
            resolve(true); // Responded, port is open
          });
          req.on('error', () => {
            resolve(false);
          });
          req.setTimeout(1000, () => {
            req.destroy();
            resolve(false);
          });
        });

        const ok = await checkPromise;
        if (ok) {
          isHealthy = true;
          break;
        }
        await new Promise(r => setTimeout(r, 1000));
      }

      if (!isHealthy) {
        await updateLog('CẢNH BÁO: Container mới khởi động thất bại hoặc không phản hồi trên cổng HTTP. Đang tiến hành rollback...');
        try {
          await this.dockerService.removeContainer(container.id);
        } catch {}
        throw new Error('Health check failed: Ứng dụng không phản hồi sau 15 giây khởi chạy.');
      }

      await updateLog('Container mới hoạt động ổn định! Đang thực hiện cutover traffic...');

      // ── Cutover Traffic ──
      this.nginxService.generateProxyConfig(
        project.subdomain,
        newHostPort,
        project.name,
        project.customDomain || undefined,
        project.sslStatus === 'active'
      );

      if (hasOldContainer && project.containerId) {
        await updateLog('Đang dọn dẹp phiên bản cũ...');
        try {
          await this.dockerService.removeContainer(project.containerId);
        } catch (e: any) {
          this.logger.warn(`Could not remove old container ${project.containerId}: ${e.message}`);
        }

        // Clean up old deployment images for this project to prevent disk bloating
        try {
          const images = await this.dockerService.listImages();
          for (const img of images) {
            if (img.RepoTags) {
              for (const tag of img.RepoTags) {
                // Find previous dep-X images for this project, except the current one we just built
                if (tag.startsWith(`potato-app-${project.id}:dep-`) && !tag.endsWith(`:dep-${deploymentId}`)) {
                  await this.dockerService.removeImage(tag);
                  this.logger.log(`Cleaned up old build image: ${tag}`);
                }
              }
            }
          }
          // Also prune dangling build layers (dangling: true)
          await this.dockerService.pruneImages();
        } catch (imgCleanupErr: any) {
          this.logger.warn(`Failed to clean up old build images for project ${project.id}: ${imgCleanupErr.message}`);
        }
      }

      if (hasOldContainer) {
        try {
          const dockerContainer = this.dockerService.getContainer(container.id);
          await dockerContainer.rename({ name: containerName });
        } catch (e: any) {
          this.logger.warn(`Could not rename temp container ${container.id} to ${containerName}: ${e.message}`);
        }
      }

      await this.prisma.project.update({
        where: { id: project.id },
        data: { containerId: container.id, status: 'running', hostPort: newHostPort },
      });

      const duration = Math.floor((Date.now() - startTime) / 1000);

      await this.prisma.deploymentLog.update({
        where: { id: deploymentId },
        data: {
          status: 'success',
          gitCommit: latestCommit?.hash?.substring(0, 7),
          gitMessage: latestCommit?.message,
          duration,
          log: logBuffer,
        },
      });

      await this.prisma.project.update({
        where: { id: project.id },
        data: { deployStatus: 'success', lastDeployedAt: new Date() },
      });

      await updateLog(`Thu hoạch thành công sau ${duration}s! 🥔🚀`);

      // Trigger Slack success alert if enabled
      const projectData = await this.prisma.project.findUnique({ where: { id: project.id } });
      if (projectData?.slackWebhook) {
        this.sendSlackAlert(
          projectData.slackWebhook,
          project.name,
          'success',
          `Phiên bản mới đã được cập nhật thành công!\n**Commit:** ${latestCommit?.hash?.substring(0, 7) || 'N/A'}\n**Nội dung:** ${latestCommit?.message || 'Manual deploy'}\n**Thời gian chạy:** ${duration}s`
        );
      }
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      await updateLog(`LỖI: ${msg}`);
      const duration = Math.floor((Date.now() - startTime) / 1000);

      await this.prisma.deploymentLog.update({
        where: { id: deploymentId },
        data: { status: 'failed', duration, log: logBuffer },
      });

      await this.prisma.project.update({
        where: { id: project.id },
        data: { deployStatus: 'failed' },
      });

      // Send Slack fail alert
      const projectData = await this.prisma.project.findUnique({ where: { id: project.id } });
      if (projectData?.slackWebhook) {
        this.sendSlackAlert(
          projectData.slackWebhook,
          project.name,
          'failed',
          `Quá trình triển khai gặp lỗi:\n\`\`\`\n${msg}\n\`\`\`\n**Thời gian chạy:** ${duration}s`
        );
      }
    } finally {
      // Cleanup tmp directory
      try { fs.rmSync(tmpDir, { recursive: true, force: true }); } catch { }
    }
  }

  // ─── Deployment History ──────────────────────────────────────────────

  async getDeployments(projectId: number) {
    await this.findProjectOrFail(projectId);
    return this.prisma.deploymentLog.findMany({
      where: { projectId },
      orderBy: { createdAt: 'desc' },
      take: 20,
    });
  }

  // ─── Helpers ─────────────────────────────────────────────────────────

  /**
   * Finds a project by ID or throws NotFoundException.
   */
  private async findProjectOrFail(projectId: number) {
    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
      include: { databases: true, envVariables: true },
    });

    if (!project) {
      throw new NotFoundException(`Project with ID ${projectId} not found`);
    }

    return project;
  }

  /**
   * Allocates a free random port in the 10000-19999 range.
   * Checks all running Docker containers to avoid port conflicts.
   */
  private async allocatePort(): Promise<number> {
    const maxAttempts = 100;

    // 1. Lấy tất cả các cổng của dự án đã ghi nhận trong DB
    const projects = await this.prisma.project.findMany({
      select: { hostPort: true },
    });
    const dbPorts = projects.map(p => p.hostPort).filter(p => p !== null) as number[];

    // 2. Lấy tất cả cổng Host đang bị chiếm dụng thực tế bởi Docker containers
    let dockerPorts: Set<number>;
    try {
      dockerPorts = await this.dockerService.getUsedHostPorts();
    } catch {
      this.logger.warn('Could not inspect Docker ports, falling back to random allocation');
      dockerPorts = new Set();
    }

    for (let i = 0; i < maxAttempts; i++) {
      const port =
        Math.floor(Math.random() * (PORT_RANGE_MAX - PORT_RANGE_MIN + 1)) +
        PORT_RANGE_MIN;

      // Check xem cổng có bị trùng trong DB, Docker hay OS vật lý không
      if (!dbPorts.includes(port) && !dockerPorts.has(port)) {
        const physicalFree = await this.isPortPhysicalFree(port);
        if (physicalFree) {
          this.logger.log(`Allocated port ${port} (${dockerPorts.size} docker ports in use)`);
          return port;
        }
      }
    }

    throw new InternalServerErrorException(
      'Failed to allocate a free port after maximum attempts',
    );
  }

  private isPortPhysicalFree(port: number): Promise<boolean> {
    return new Promise((resolve) => {
      const server = require('net').createServer();
      server.once('error', () => {
        resolve(false);
      });
      server.once('listening', () => {
        server.close();
        resolve(true);
      });
      server.listen(port);
    });
  }

  // ─── Activity Logs ────────────────────────────────────────────────────

  async logActivity(projectId: number, type: string, message: string) {
    try {
      await this.prisma.activityLog.create({
        data: { projectId, type, message },
      });
    } catch (err) {
      this.logger.warn(`Failed to log activity for project ${projectId}: ${err.message}`);
    }
  }

  async getActivityLogs(projectId: number) {
    return this.prisma.activityLog.findMany({
      where: { projectId },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
  }

  // ─── Restart Policy ───────────────────────────────────────────────────

  async updateRestartPolicy(projectId: number, policy: string) {
    const validPolicies = ['no', 'on-failure', 'always', 'unless-stopped'];
    if (!validPolicies.includes(policy)) {
      throw new BadRequestException(`Invalid restart policy. Valid options: ${validPolicies.join(', ')}`);
    }

    const project = await this.findProjectOrFail(projectId);

    // If container is running, we need to update via docker update + recreate
    // Docker doesn't support updating RestartPolicy on a live container directly,
    // so we record the intent in DB and it applies on next container recreate.
    const updated = await this.prisma.project.update({
      where: { id: projectId },
      data: { restartPolicy: policy },
    });

    await this.logActivity(projectId, 'UPDATE_POLICY', `Restart policy changed to "${policy}"`);
    this.logger.log(`Restart policy for project ${projectId} set to "${policy}"`);

    return updated;
  }

  /**
   * Fetches full logs for a project (Docker logs or last deployment log).
   */
  async getProjectLogs(projectId: number): Promise<string> {
    const project = await this.findProjectOrFail(projectId);

    // 1. Try to get live Docker logs if container exists
    if (project.containerId) {
      try {
        const logs = await this.dockerService.getContainerLogs(project.containerId);
        if (logs && logs.trim().length > 0) {
          return logs;
        }
      } catch (err) {
        this.logger.warn(`Failed to fetch Docker logs for project ${projectId}: ${err.message}`);
      }
    }

    // 2. Fallback: Get the latest deployment log
    const lastDeploy = await this.prisma.deploymentLog.findFirst({
      where: { projectId },
      orderBy: { createdAt: 'desc' },
    });

    if (lastDeploy) {
      return `[DEPLOYMENT LOG - ${lastDeploy.createdAt.toISOString()}]\n\n${lastDeploy.log || 'No log content available.'}`;
    }

    return 'No logs found for this project.';
  }

  async updateSettings(id: number, volumeMapping?: string, slackWebhook?: string, alertInterval?: number) {
    await this.findProjectOrFail(id);
    const data: any = {};
    if (volumeMapping !== undefined) data.volumeMapping = volumeMapping;
    if (slackWebhook !== undefined) data.slackWebhook = slackWebhook;
    if (alertInterval !== undefined) data.alertInterval = alertInterval;

    return this.prisma.project.update({
      where: { id },
      data,
    });
  }

  async sendTestAlert(id: number) {
    const project = await this.prisma.project.findUnique({
      where: { id },
      select: { id: true, name: true, slackWebhook: true, containerId: true, status: true },
    });
    if (!project) throw new Error('Dự án không tồn tại');
    if (!project.slackWebhook) throw new Error('Chưa cấu hình Slack Webhook cho dự án này');

    let statsLine = '_Dự án không đang chạy, không có thông số thực tế._';
    if (project.status === 'running' && project.containerId) {
      try {
        const stats = await this.dockerService.getContainerStats(project.containerId);
        statsLine = `CPU: *${stats.cpuPercent.toFixed(1)}%* | RAM: *${stats.memoryUsageMB.toFixed(0)}MB* / ${stats.memoryLimitMB.toFixed(0)}MB (${stats.memoryPercent.toFixed(1)}%)`;
      } catch {
        statsLine = '_Không lấy được thông số container lúc này._';
      }
    }

    await this.sendSlackAlert(
      project.slackWebhook,
      project.name,
      'success',
      `🧪 *Đây là tin nhắn thử nghiệm từ Potato!*\n\nKết nối Slack Webhook của dự án *${project.name}* hoạt động bình thường ✅\n\n📊 Thông số hiện tại: ${statsLine}\n\n_Bạn sẽ nhận được tin nhắn tương tự khi CPU / RAM / Disk vượt ngưỡng cảnh báo._`,
    );

    return { ok: true, message: 'Đã gửi tin nhắn thử nghiệm về Slack thành công!' };
  }

  public async sendSlackAlert(webhookUrl: string, projectName: string, status: 'success' | 'failed' | 'warning', detailMessage: string) {
    if (!webhookUrl) return;
    try {
      const http = require('https');
      
      const payload = {
        text: status === 'success' 
          ? `🚀 *Thông báo từ Potato: ${projectName}*` 
          : status === 'warning'
            ? `⚠️ *Cảnh báo từ Potato: ${projectName}*`
            : `🚨 *Lỗi nghiêm trọng từ Potato: ${projectName}*`,
        attachments: [
          {
            color: status === 'success' ? '#2eb886' : status === 'warning' ? '#e0a800' : '#a30200',
            text: detailMessage,
            fallback: detailMessage,
            ts: Math.floor(Date.now() / 1000)
          }
        ]
      };

      const dataStr = JSON.stringify(payload);
      const dataBuffer = Buffer.from(dataStr, 'utf8');
      const url = new URL(webhookUrl);
      
      const options = {
        hostname: url.hostname,
        path: url.pathname + url.search,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': dataBuffer.byteLength
        }
      };

      const req = http.request(options, (res: any) => {
        let body = '';
        res.on('data', (chunk: any) => body += chunk);
        res.on('end', () => {
          if (res.statusCode !== 200) {
            this.logger.warn(`Slack webhook returned ${res.statusCode}: ${body}`);
          }
        });
      });
      req.on('error', (e: any) => {
        this.logger.warn(`Failed to send Slack alert: ${e.message}`);
      });
      req.write(dataBuffer);
      req.end();
    } catch (err: any) {
      this.logger.warn(`Error sending Slack alert: ${err.message}`);
    }
  }

  async rollbackProject(projectId: number, deploymentId: number) {
    const project = await this.findProjectOrFail(projectId);
    const deployment = await this.prisma.deploymentLog.findFirst({
      where: { id: deploymentId, projectId },
    });
    if (!deployment) {
      throw new NotFoundException(`Không tìm thấy phiên bản deployment ID ${deploymentId} của dự án.`);
    }

    const rollbackImageName = `potato-app-${projectId}:dep-${deploymentId}`;

    let imageExists = true;
    try {
      await this.dockerService.inspectImage(rollbackImageName);
    } catch (err) {
      imageExists = false;
    }

    if (!imageExists) {
      if (!project.gitRepo) {
        throw new BadRequestException('Không thể rollback vì không tìm thấy ảnh Docker cũ và không có mã nguồn Git để build lại.');
      }
      return this.deployFromGit(projectId, project.gitRepo, deployment.gitCommit || project.deployBranch || 'main', project.gitToken || undefined);
    }

    this.logger.log(`Performing rapid rollback for project ${projectId} to deployment ${deploymentId}`);

    const newDeployment = await this.prisma.deploymentLog.create({
      data: {
        projectId,
        trigger: 'rollback',
        status: 'deploying',
        gitCommit: deployment.gitCommit,
        gitMessage: `Rollback về phiên bản #${deploymentId}: ${deployment.gitMessage || ''}`,
      }
    });

    this.runRollbackBackground(project, newDeployment.id, rollbackImageName, deployment.gitCommit).catch(err => {
      this.logger.error(`Rollback failed for project ${projectId}: ${err.message}`);
    });

    await this.logActivity(projectId, 'DEPLOY', `Yêu cầu rollback về phiên bản #${deploymentId} được kích hoạt`);
    return { deploymentId: newDeployment.id, status: 'deploying', message: 'Rollback started in background' };
  }

  private async runRollbackBackground(
    project: any,
    deploymentId: number,
    rollbackImageName: string,
    gitCommit: string | null,
  ) {
    const startTime = Date.now();
    let logBuffer = '';

    const updateLog = async (msg: string) => {
      this.logger.log(`[Rollback ${deploymentId}] ${msg}`);
      logBuffer += `${new Date().toISOString()} ${msg}\n`;
      await this.prisma.deploymentLog.update({
        where: { id: deploymentId },
        data: { log: logBuffer },
      }).catch(() => { });
    };

    try {
      await updateLog(`Bắt đầu rollback về phiên bản sử dụng ảnh ${rollbackImageName}...`);
      
      let hostPort = project.hostPort;
      if (!hostPort) {
        hostPort = await this.allocatePort();
        await this.prisma.project.update({
          where: { id: project.id },
          data: { hostPort },
        });
        project.hostPort = hostPort;
      }

      const containerName = `potato-${project.subdomain}`;
      const hasOldContainer = !!project.containerId;
      let newHostPort = hostPort;
      let newContainerName = containerName;

      if (hasOldContainer) {
        newHostPort = await this.allocatePort();
        newContainerName = `potato-${project.subdomain}-temp-${Date.now()}`;
      }

      await updateLog('Đang chuẩn bị biến môi trường...');
      const finalEnvs = await this.prisma.envVariable.findMany({ where: { projectId: project.id } });
      const envArray = finalEnvs.map(e => `${e.key}=${e.isSecret ? decrypt(e.value) : e.value}`);

      let targetPort = '3000';
      try {
        const imageInfo = await this.dockerService.inspectImage(rollbackImageName);
        if (imageInfo.Config?.ExposedPorts) {
          const ports = Object.keys(imageInfo.Config.ExposedPorts);
          if (ports.length > 0) {
            targetPort = ports[0].split('/')[0];
          }
        }
      } catch (e) {
        this.logger.warn(`Failed to inspect rollback image: ${e}`);
      }

      const portBindings: any = {};
      portBindings[`${targetPort}/tcp`] = [{ HostPort: String(newHostPort) }];
      portBindings['3000/tcp'] = [{ HostPort: String(newHostPort) }];
      portBindings['80/tcp'] = [{ HostPort: String(newHostPort) }];

      const hostVolumeDir = path.resolve(path.join(process.cwd(), 'uploads', 'volumes', `project-${project.id}`));
      fs.mkdirSync(hostVolumeDir, { recursive: true });
      const containerVolumePath = project.volumeMapping || '/app/storage';

      await updateLog(`Đang khởi tạo container từ ảnh rollback: ${rollbackImageName}...`);
      const container = await this.dockerService.createContainer({
        Image: rollbackImageName,
        name: newContainerName,
        Env: envArray,
        ExposedPorts: { [`${targetPort}/tcp`]: {} },
        HostConfig: {
          Memory: project.ramLimit * 1024 * 1024,
          MemorySwap: project.ramLimit * 1024 * 1024,
          NanoCPUs: Math.floor(project.cpuLimit * 1000000000),
          PortBindings: portBindings,
          Binds: [`${hostVolumeDir}:${containerVolumePath}`],
          RestartPolicy: { Name: 'unless-stopped' },
        } as any,
      });

      await this.dockerService.startContainer(container.id);
      await updateLog('Đang kiểm tra trạng thái hoạt động của container mới...');

      let isHealthy = false;
      const http = require('http');

      for (let i = 0; i < 15; i++) {
        const checkPromise = new Promise<boolean>((resolve) => {
          const req = http.get(`http://localhost:${newHostPort}`, (res: any) => {
            resolve(true);
          });
          req.on('error', () => {
            resolve(false);
          });
          req.setTimeout(1000, () => {
            req.destroy();
            resolve(false);
          });
        });

        const ok = await checkPromise;
        if (ok) {
          isHealthy = true;
          break;
        }
        await new Promise(r => setTimeout(r, 1000));
      }

      if (!isHealthy) {
        await updateLog('❌ Rollback thất bại: Container mới không phản hồi HTTP. Tiến hành hủy rollback.');
        await this.dockerService.removeContainer(container.id);
        throw new Error('Health check failed: Ứng dụng không phản hồi sau 15 giây khởi chạy.');
      }

      await updateLog('Container hoạt động ổn định! Đang thực hiện cutover traffic...');
      
      this.nginxService.generateProxyConfig(
        project.subdomain,
        newHostPort,
        project.name,
        project.customDomain || undefined,
        project.sslStatus === 'active'
      );
      await updateLog('Đã cập nhật định tuyến Nginx Proxy.');

      if (hasOldContainer) {
        await updateLog('Đang dọn dẹp phiên bản cũ...');
        try {
          await this.dockerService.stopContainer(project.containerId);
          await this.dockerService.removeContainer(project.containerId);
        } catch (err: any) {
          this.logger.warn(`Failed to clean up old container: ${err.message}`);
        }
      }

      try {
        await this.dockerService.getContainer(container.id).rename({ name: containerName });
      } catch (err: any) {
        this.logger.warn(`Failed to rename container: ${err.message}`);
      }

      await this.prisma.project.update({
        where: { id: project.id },
        data: {
          containerId: container.id,
          status: 'running',
          hostPort: newHostPort,
        },
      });

      try {
        await this.dockerService.tagImage(rollbackImageName, `potato-app-${project.id}`, 'latest');
      } catch (err: any) {
        this.logger.warn(`Failed to update latest tag: ${err.message}`);
      }

      const duration = Math.round((Date.now() - startTime) / 1000);
      await this.prisma.deploymentLog.update({
        where: { id: deploymentId },
        data: {
          status: 'success',
          duration,
          log: logBuffer + `${new Date().toISOString()} Hoàn tất rollback thành công! 🥔🚀\n`,
        },
      });

      await this.prisma.project.update({
        where: { id: project.id },
        data: { deployStatus: 'success', lastDeployedAt: new Date() },
      });

      await this.logActivity(project.id, 'DEPLOY', `Rollback về phiên bản #${gitCommit?.substring(0, 7) || ''} thành công.`);
      
      const projectData = await this.prisma.project.findUnique({ where: { id: project.id } });
      if (projectData?.slackWebhook) {
        this.sendSlackAlert(
          projectData.slackWebhook,
          project.name,
          'success',
          `Đã quay lui (rollback) về phiên bản thành công!\n**Commit:** ${gitCommit?.substring(0, 7) || 'N/A'}\n**Thời gian chạy:** ${duration}s`
        );
      }

    } catch (err: any) {
      const duration = Math.round((Date.now() - startTime) / 1000);
      await updateLog(`❌ Lỗi rollback: ${err.message}`);
      await this.prisma.deploymentLog.update({
        where: { id: deploymentId },
        data: { status: 'failed', duration },
      });

      await this.prisma.project.update({
        where: { id: project.id },
        data: { deployStatus: 'failed' },
      });

      await this.logActivity(project.id, 'DEPLOY', `Rollback thất bại: ${err.message}`);

      const projectData = await this.prisma.project.findUnique({ where: { id: project.id } });
      if (projectData?.slackWebhook) {
        this.sendSlackAlert(
          projectData.slackWebhook,
          project.name,
          'failed',
          `Quá trình quay lui (rollback) gặp lỗi:\n\`\`\`\n${err.message}\n\`\`\`\n**Thời gian chạy:** ${duration}s`
        );
      }
    }
  }

  @Cron(CronExpression.EVERY_MINUTE)
  async monitorContainersHealth() {
    this.logger.log('🔍 Checking health of all running project containers...');
    const runningProjects = await this.prisma.project.findMany({
      where: { status: 'running', containerId: { not: null } },
    });

    for (const project of runningProjects) {
      try {
        const containerState = await this.dockerService.getContainerState(project.containerId!);
        if (!containerState.running) {
          this.logger.warn(`Container for project "${project.name}" (${project.id}) is not running! State: ${containerState.status}`);
          
          const shouldRestart = project.restartPolicy === 'always' || 
            (project.restartPolicy === 'on-failure' && containerState.exitCode !== 0);

          if (shouldRestart) {
            this.logger.log(`🔄 Attempting auto-restart of project "${project.name}"...`);
            await this.prisma.activityLog.create({
              data: {
                projectId: project.id,
                type: 'START',
                message: `Container dừng đột ngột (Exit Code: ${containerState.exitCode}). Đang tự động khởi động lại...`
              }
            });

            try {
              await this.dockerService.startContainer(project.containerId!);
              
              if (project.slackWebhook) {
                await this.sendSlackAlert(
                  project.slackWebhook,
                  project.name,
                  'success',
                  `⚠️ **Cảnh báo:** Container bị tắt đột ngột (Exit Code: ${containerState.exitCode}).\n🔄 **Hành động:** Đã kích hoạt cơ chế tự động khởi động lại (Restart Policy: ${project.restartPolicy}) thành công.`
                );
              }
            } catch (restartErr: any) {
              this.logger.error(`Failed to auto-restart project ${project.id}: ${restartErr.message}`);
              if (project.slackWebhook) {
                await this.sendSlackAlert(
                  project.slackWebhook,
                  project.name,
                  'failed',
                  `🚨 **Cảnh báo:** Container bị tắt đột ngột (Exit Code: ${containerState.exitCode}).\n❌ **Hành động:** Thử tự động khởi động lại thất bại: ${restartErr.message}`
                );
              }
            }
          } else {
            await this.prisma.project.update({
              where: { id: project.id },
              data: { status: 'stopped' },
            });

            await this.prisma.activityLog.create({
              data: {
                projectId: project.id,
                type: 'STOP',
                message: `Container dừng đột ngột (Exit Code: ${containerState.exitCode}).`
              }
            });

            if (project.slackWebhook) {
              await this.sendSlackAlert(
                project.slackWebhook,
                project.name,
                'failed',
                `🚨 **Cảnh báo:** Container bị tắt đột ngột (Exit Code: ${containerState.exitCode}). Không cấu hình tự khởi động lại.`
              );
            }
          }
        }
      } catch (err: any) {
        const isNotFound = err.message?.toLowerCase().includes('no such container') || err.statusCode === 404 || err.status === 404;
        if (isNotFound) {
          this.logger.warn(`Container for project "${project.name}" (${project.id}) was not found in Docker. Resetting status to stopped.`);
          await this.prisma.project.update({
            where: { id: project.id },
            data: { status: 'stopped', containerId: null },
          }).catch(() => {});
          
          await this.prisma.activityLog.create({
            data: {
              projectId: project.id,
              type: 'STOP',
              message: `Không tìm thấy container của dự án trên hệ thống Docker. Trạng thái đã được tự động đưa về Stopped.`
            }
          }).catch(() => {});
        } else {
          this.logger.error(`Error monitoring health of project ${project.id}: ${err.message}`);
        }
      }
    }
  }
}
