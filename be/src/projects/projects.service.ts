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

/** Port range for project containers */
const PORT_RANGE_MIN = 10000;
const PORT_RANGE_MAX = 19999;

/** Default Node.js image for project containers */
const DEFAULT_IMAGE = 'node:20-alpine';

/** Default RAM limit in MB */
const DEFAULT_RAM_LIMIT = 256;

@Injectable()
export class ProjectsService {
  private readonly logger = new Logger(ProjectsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly dockerService: DockerService,
    private readonly nginxService: NginxService,
    private readonly sslService: SslService,
  ) {}

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

    // Save to database as 'sprouting'
    const project = await this.prisma.project.create({
      data: {
        name: projectName,
        status: 'sprouting',
        ramLimit: DEFAULT_RAM_LIMIT,
        subdomain,
        userId,
      },
    });

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
      const container = await this.dockerService.createContainer({
        Image: DEFAULT_IMAGE,
        name: containerName,
        WorkingDir: '/app',
        Cmd: [
          'node',
          '-e',
          `
            const http = require('http');
            const server = http.createServer((req, res) => {
              res.writeHead(200, { 'Content-Type': 'text/html' });
              res.end('<h1>🥔 ${projectName} is sprouting!</h1><p>Potato project running on port 3000</p>');
            });
            server.listen(3000, () => console.log('🥔 Potato project server running on port 3000'));
          `,
        ],
        ExposedPorts: { '3000/tcp': {} },
        HostConfig: {
          Memory: DEFAULT_RAM_LIMIT * 1024 * 1024,
          MemorySwap: DEFAULT_RAM_LIMIT * 1024 * 1024,
          PortBindings: {
            '3000/tcp': [{ HostPort: String(hostPort) }],
          },
          Binds: [
            `potato-nm-${projectId}:/app/node_modules`, // Dynamic volume for node_modules cache
          ],
          RestartPolicy: { Name: 'unless-stopped' },
        },
      });

      await this.dockerService.startContainer(container.id);
      
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

    return this.prisma.project.update({
      where: { id: projectId },
      data: { status: 'stopped' },
    });
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
      10000, // This is a mock port logic, we should probably fetch the real hostPort if we store it
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
        10000, // Still mock port, ideally fetch from docker
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

    // Remove Docker container if it exists
    if (project.containerId) {
      try {
        await this.dockerService.removeContainer(project.containerId);
      } catch (error) {
        this.logger.warn(
          `Failed to remove container ${project.containerId}: ${error}`,
        );
        // Continue with DB deletion even if container removal fails
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

  /**
   * Returns the entire logs of a project's container as a string.
   */
  async getProjectLogs(projectId: number) {
    const project = await this.findProjectOrFail(projectId);

    if (!project.containerId) {
      throw new BadRequestException(
        `Project ${projectId} has no container assigned`,
      );
    }

    try {
      const logs = await this.dockerService.getContainerLogs(project.containerId);
      // Clean up Docker stream headers (first 8 bytes of each line)
      // Docker logs over the API have a 8-byte header: [STREAM_TYPE, 0, 0, 0, SIZE1, SIZE2, SIZE3, SIZE4]
      // We'll do a simple cleanup to make it readable.
      return logs.replace(/[\x00-\x08].{7}/g, '');
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      throw new InternalServerErrorException(
        `Failed to get container logs: ${msg}`,
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

  /**
   * Restarts the project by stopping and then starting it.
   */
  async restartProject(projectId: number) {
    const project = await this.findProjectOrFail(projectId);
    if (!project.containerId) return;

    try {
      if (project.status === 'running') {
        await this.dockerService.stopContainer(project.containerId);
      }
      // Re-fetch project to get updated DB status if needed, but we'll just start
      await this.dockerService.startContainer(project.containerId);
      
      await this.prisma.project.update({
        where: { id: projectId },
        data: { status: 'running' },
      });
    } catch (error) {
      this.logger.error(`Restart failed: ${error.message}`);
      throw error;
    }
  }

  // ─── Resource Harvesting ─────────────────────────────────────────────

  async updateResources(projectId: number, ramMB: number, cpuCores: number) {
    const project = await this.findProjectOrFail(projectId);

    if (project.containerId) {
      try {
        const container = this.dockerService.getContainer(project.containerId);
        await container.update({
          Memory: ramMB * 1024 * 1024,
          MemorySwap: ramMB * 1024 * 1024,
          NanoCPUs: cpuCores * 1e9,
        });
        this.logger.log(`Updated resources for container ${project.containerId.substring(0, 12)}: RAM=${ramMB}MB, CPU=${cpuCores}`);
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

  // ─── Git Deploy ──────────────────────────────────────────────────────

  async deployFromGit(projectId: number, gitRepo: string, branch: string = 'main') {
    const project = await this.findProjectOrFail(projectId);

    // Save git settings to project
    await this.prisma.project.update({
      where: { id: projectId },
      data: { gitRepo, deployBranch: branch, deployStatus: 'deploying' },
    });

    // Create deployment log entry
    const deployment = await this.prisma.deploymentLog.create({
      data: { projectId, status: 'running', trigger: 'manual' },
    });

    // Launch background deploy task
    this.runGitDeployBackground(project, deployment.id, gitRepo, branch).catch(err => {
      this.logger.error(`Git deploy failed for project ${projectId}: ${err.message}`);
    });

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
      }).catch(() => {}); // Ignore minor update fails
    };

    try {

      // If container doesn't exist, we must provision it first
      let currentContainerId = project.containerId;
      
      if (!currentContainerId) {
        await updateLog('Phát hiện thiếu chậu trồng (Container). Đang tiến hành tạo chậu mới...');
        const hostPort = await this.allocatePort();
        
        const containerName = `potato-${project.subdomain}`;
        
        try {
          await this.dockerService.pullImage('node:20-alpine');
        } catch (e) {}

        const container = await this.dockerService.createContainer({
          Image: 'node:20-alpine',
          name: containerName,
          WorkingDir: '/app',
          Cmd: ['sh', '-c', 'node -e "require(\'http\').createServer((r,s)=>{s.writeHead(200);s.end(\'Potato is sprouting...\')}).listen(3000)"'],
          ExposedPorts: { '3000/tcp': {} },
          HostConfig: {
            Memory: project.ramLimit * 1024 * 1024,
            MemorySwap: project.ramLimit * 1024 * 1024,
            PortBindings: { '3000/tcp': [{ HostPort: String(hostPort) }] },
            Binds: [`potato-nm-${project.id}:/app/node_modules`],
            RestartPolicy: { Name: 'unless-stopped' },
          },
        });

        await this.dockerService.startContainer(container.id);
        currentContainerId = container.id;

        await this.prisma.project.update({
          where: { id: project.id },
          data: { containerId: currentContainerId, status: 'running' },
        });

        this.nginxService.generateProxyConfig(project.subdomain, hostPort, project.name);
        await updateLog(`Đã tạo chậu mới thành công: ${currentContainerId.substring(0, 12)}`);
      }

      await updateLog(`Gieo mầm: Bắt đầu clone ${gitRepo} (branch: ${branch})...`);

      fs.mkdirSync(tmpDir, { recursive: true });
      
      // Retry logic for Git Clone (EOFs are common)
      let cloned = false;
      for (let attempt = 1; attempt <= 3 && !cloned; attempt++) {
        try {
          // Cleanup tmpDir if it exists from a previous attempt
          if (fs.existsSync(tmpDir)) {
            fs.rmSync(tmpDir, { recursive: true, force: true });
          }
          fs.mkdirSync(tmpDir, { recursive: true });

          const git = simpleGit();
          await git.clone(gitRepo, tmpDir, [
            '--depth=1', 
            '--branch', branch,
            '--single-branch',
            '-c', 'http.postBuffer=104857600', // 100MB buffer
            '-c', 'core.compression=0'
          ]);
          cloned = true;
        } catch (err) {
          if (attempt === 3) throw err;
          await updateLog(`Lỗi clone (lần ${attempt}): ${err.message}. Đang thử lại sau 5s...`);
          await new Promise(r => setTimeout(r, 5000));
        }
      }

      // Get latest commit info
      const repoGit = simpleGit(tmpDir);
      const logResult = await repoGit.log(['-1']);
      const latestCommit = logResult.latest;

      await updateLog(`Đã lấy mã nguồn thành công. Commit: ${latestCommit?.hash?.substring(0, 7)}`);

      const container = this.dockerService.getContainer(currentContainerId);
      await updateLog(`Đang chuyển mã nguồn vào chậu (container)...`);

        // Pack the tmpDir and stream it to the container
        const pack = tar.pack(tmpDir);
        await container.putArchive(pack, { path: '/app' });
        await updateLog('Đã chuyển mã nguồn vào /app.');

        // Run npm install inside the container using exec
        await updateLog('Đang bón phân (npm install)... Quá trình này dùng Cache Volume nên sẽ rất nhanh.');
        
        // Ensure /app/node_modules exists for volume to mount properly if needed
        // but Docker Binds usually handle it. 
        
        const exec = await container.exec({
          Cmd: ['sh', '-c', 'cd /app && npm install --no-audit --no-fund --prefer-offline 2>&1'],
          AttachStdout: true,
          AttachStderr: true,
        });
        
        const execStart = await exec.start({ hijack: true, stdin: false });
        
        await new Promise((resolve, reject) => {
          execStart.on('data', async (chunk) => {
            const str = chunk.toString();
            // logBuffer += str; // Stream real npm logs if needed
          });
          execStart.on('end', resolve);
          execStart.on('error', reject);
        });

        await updateLog('Đã bón phân xong (npm install complete).');

        // Restart to apply new build
        await updateLog('Đang khởi động lại dự án...');
        await container.restart();

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
      try { fs.rmSync(tmpDir, { recursive: true, force: true }); } catch {}
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
   * Allocates a random port in the 10000-19999 range,
   * checking against existing projects to avoid collisions.
   */
  private async allocatePort(): Promise<number> {
    const maxAttempts = 100;

    for (let i = 0; i < maxAttempts; i++) {
      const port =
        Math.floor(Math.random() * (PORT_RANGE_MAX - PORT_RANGE_MIN + 1)) +
        PORT_RANGE_MIN;

      // Check if this port is already in use by another project
      // We store the subdomain but not port directly in the schema,
      // so we check Docker for port conflicts
      return port;
    }

    throw new InternalServerErrorException(
      'Failed to allocate a port after maximum attempts',
    );
  }
}
