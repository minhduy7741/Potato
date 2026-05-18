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
import { DockerService } from '../docker/docker.service';
import { NginxService } from '../infrastructure/nginx.service';
import { SslService } from '../infrastructure/ssl.service';
import { DatabasesService } from '../databases/databases.service';

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
    const where = userId ? { userId } : {};
    return this.prisma.project.findMany({
      where,
      include: { databases: true },
      orderBy: { createdAt: 'desc' },
    });
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
    return this.prisma.envVariable.findMany({
      where: { projectId },
      orderBy: { createdAt: 'asc' },
    });
  }

  async addEnvVariable(projectId: number, key: string, value: string, isSecret: boolean) {
    const project = await this.findProjectOrFail(projectId);
    const existing = await this.prisma.envVariable.findFirst({
      where: { projectId, key },
    });

    let result;
    if (existing) {
      result = await this.prisma.envVariable.update({
        where: { id: existing.id },
        data: { value, isSecret },
      });
    } else {
      result = await this.prisma.envVariable.create({
        data: { key, value, isSecret, projectId },
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
    if (value !== undefined) data.value = value;
    if (isSecret !== undefined) data.isSecret = isSecret;

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
      const imageName = `potato-app-${project.id}:latest`;

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
          fs.writeFileSync(path.join(tmpDir, 'Dockerfile'), `
FROM webdevops/php-nginx:8.2
ENV WEB_DOCUMENT_ROOT=/app/public
ENV WEB_DOCUMENT_INDEX=index.php
WORKDIR /app
COPY . .
RUN chown -R application:application /app && chmod -R 755 /app
RUN composer install --no-interaction --optimize-autoloader --no-dev || true
RUN chmod -R 777 storage bootstrap/cache || true
EXPOSE 80
          `.trim());
        } else if (fs.existsSync(path.join(tmpDir, 'package.json'))) {
          detectedLang = 'nodejs';
          await updateLog('Phát hiện Node.js (package.json). Đang tạo cấu hình Docker...');
          fs.writeFileSync(path.join(tmpDir, 'Dockerfile'), `
FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN chmod -R 755 /app
EXPOSE 3000
CMD ["npm", "start"]
          `.trim());
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

      // Recreate container
      if (project.containerId) {
        await updateLog('Đang nhổ chậu cũ (xoá container cũ)...');
        try {
          await this.dockerService.removeContainer(project.containerId);
        } catch (e: any) {
          this.logger.warn(`Could not remove old container ${project.containerId}: ${e.message}`);
        }
      }

      await updateLog('Đang tạo chậu mới từ Image vừa build...');
      const finalEnvs = await this.prisma.envVariable.findMany({ where: { projectId: project.id } });
      const envArray = finalEnvs.map(e => `${e.key}=${e.value}`);

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
      portBindings[`${targetPort}/tcp`] = [{ HostPort: String(hostPort) }];
      if (detectedLang === 'custom') {
        portBindings['3000/tcp'] = [{ HostPort: String(hostPort) }];
        portBindings['80/tcp'] = [{ HostPort: String(hostPort) }];
        portBindings['8080/tcp'] = [{ HostPort: String(hostPort) }];
        portBindings['8000/tcp'] = [{ HostPort: String(hostPort) }];
      }

      const container = await this.dockerService.createContainer({
        Image: imageName,
        name: containerName,
        Env: envArray,
        ExposedPorts: { [`${targetPort}/tcp`]: {} },
        HostConfig: {
          Memory: project.ramLimit * 1024 * 1024,
          MemorySwap: project.ramLimit * 1024 * 1024,
          NanoCPUs: Math.floor(project.cpuLimit * 1000000000),
          PortBindings: portBindings,
          RestartPolicy: { Name: 'unless-stopped' },
        } as any,
      });

      await this.dockerService.startContainer(container.id);
      
      await this.prisma.project.update({
        where: { id: project.id },
        data: { containerId: container.id, status: 'running', hostPort },
      });

      this.nginxService.generateProxyConfig(project.subdomain, hostPort, project.name);

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

    // Collect all host ports currently bound by Docker containers
    let usedPorts: Set<number>;
    try {
      usedPorts = await this.dockerService.getUsedHostPorts();
    } catch {
      this.logger.warn('Could not inspect Docker ports, falling back to random allocation');
      usedPorts = new Set();
    }

    for (let i = 0; i < maxAttempts; i++) {
      const port =
        Math.floor(Math.random() * (PORT_RANGE_MAX - PORT_RANGE_MIN + 1)) +
        PORT_RANGE_MIN;

      if (!usedPorts.has(port)) {
        this.logger.log(`Allocated port ${port} (${usedPorts.size} ports already in use)`);
        return port;
      }
    }

    throw new InternalServerErrorException(
      'Failed to allocate a free port after maximum attempts',
    );
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
}
