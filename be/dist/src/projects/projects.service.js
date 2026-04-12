"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
var ProjectsService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.ProjectsService = void 0;
const common_1 = require("@nestjs/common");
const crypto_1 = require("crypto");
const os = __importStar(require("os"));
const path = __importStar(require("path"));
const fs = __importStar(require("fs"));
const simple_git_1 = __importDefault(require("simple-git"));
const tar = __importStar(require("tar-fs"));
const prisma_service_1 = require("../prisma/prisma.service");
const docker_service_1 = require("../docker/docker.service");
const nginx_service_1 = require("../infrastructure/nginx.service");
const ssl_service_1 = require("../infrastructure/ssl.service");
const PORT_RANGE_MIN = 10000;
const PORT_RANGE_MAX = 19999;
const DEFAULT_IMAGE = 'node:20-alpine';
const DEFAULT_RAM_LIMIT = 256;
let ProjectsService = ProjectsService_1 = class ProjectsService {
    prisma;
    dockerService;
    nginxService;
    sslService;
    logger = new common_1.Logger(ProjectsService_1.name);
    constructor(prisma, dockerService, nginxService, sslService) {
        this.prisma = prisma;
        this.dockerService = dockerService;
        this.nginxService = nginxService;
        this.sslService = sslService;
    }
    async createProject(userId, projectName) {
        this.logger.log(`Creating project "${projectName}" for user ${userId}`);
        const user = await this.prisma.user.findUnique({
            where: { id: userId },
        });
        if (!user) {
            throw new common_1.NotFoundException(`User with ID ${userId} not found`);
        }
        const shortId = (0, crypto_1.randomBytes)(4).toString('hex');
        const subdomain = `${projectName.toLowerCase().replace(/[^a-z0-9]/g, '-')}-${shortId}`;
        const hostPort = await this.allocatePort();
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
    async provisionProjectBackground(projectId, projectName, subdomain, hostPort) {
        try {
            await this.dockerService.pullImage(DEFAULT_IMAGE);
        }
        catch (error) {
            this.logger.error(`Failed to pull image in background: ${error}`);
            await this.prisma.project.update({
                where: { id: projectId },
                data: { status: 'error' },
            });
            return;
        }
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
                        `potato-nm-${projectId}:/app/node_modules`,
                    ],
                    RestartPolicy: { Name: 'unless-stopped' },
                },
            });
            await this.dockerService.startContainer(container.id);
            await this.prisma.project.update({
                where: { id: projectId },
                data: {
                    containerId: container.id,
                    status: 'running'
                },
            });
            this.logger.log(`Background provisioning complete for project ${projectId}. Container ${container.id.substring(0, 12)} is running.`);
            this.nginxService.generateProxyConfig(subdomain, hostPort, projectName);
        }
        catch (error) {
            const msg = error instanceof Error ? error.message : String(error);
            this.logger.error(`Failed to create container in background: ${msg}`);
            await this.prisma.project.update({
                where: { id: projectId },
                data: { status: 'error' },
            });
        }
    }
    async startProject(projectId) {
        const project = await this.findProjectOrFail(projectId);
        if (!project.containerId) {
            throw new common_1.BadRequestException(`Project ${projectId} has no container assigned`);
        }
        if (project.status === 'running') {
            throw new common_1.BadRequestException(`Project ${projectId} is already running`);
        }
        try {
            await this.dockerService.startContainer(project.containerId);
        }
        catch (error) {
            const msg = error instanceof Error ? error.message : String(error);
            throw new common_1.InternalServerErrorException(`Failed to start container: ${msg}`);
        }
        return this.prisma.project.update({
            where: { id: projectId },
            data: { status: 'running' },
        });
    }
    async stopProject(projectId) {
        const project = await this.findProjectOrFail(projectId);
        if (!project.containerId) {
            throw new common_1.BadRequestException(`Project ${projectId} has no container assigned`);
        }
        if (project.status === 'stopped') {
            throw new common_1.BadRequestException(`Project ${projectId} is already stopped`);
        }
        try {
            await this.dockerService.stopContainer(project.containerId);
        }
        catch (error) {
            const msg = error instanceof Error ? error.message : String(error);
            throw new common_1.InternalServerErrorException(`Failed to stop container: ${msg}`);
        }
        return this.prisma.project.update({
            where: { id: projectId },
            data: { status: 'stopped' },
        });
    }
    async updateDomain(id, customDomain) {
        const project = await this.findProjectOrFail(id);
        if (customDomain) {
            const existing = await this.prisma.project.findUnique({
                where: { customDomain },
            });
            if (existing && existing.id !== id) {
                throw new common_1.ConflictException(`Domain "${customDomain}" is already connected to another project`);
            }
        }
        const updated = await this.prisma.project.update({
            where: { id },
            data: { customDomain },
        });
        this.nginxService.generateProxyConfig(project.subdomain, 10000, project.name, customDomain ?? undefined);
        return updated;
    }
    async enableHttps(id) {
        const project = await this.findProjectOrFail(id);
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
            this.nginxService.generateProxyConfig(project.subdomain, 10000, project.name, project.customDomain ?? undefined, true);
            return updated;
        }
        catch (error) {
            await this.prisma.project.update({
                where: { id },
                data: { sslStatus: 'error' },
            });
            throw new common_1.InternalServerErrorException(`SSL Provisioning failed: ${error.message}`);
        }
    }
    async deleteProject(projectId) {
        const project = await this.findProjectOrFail(projectId);
        if (project.containerId) {
            try {
                await this.dockerService.removeContainer(project.containerId);
            }
            catch (error) {
                this.logger.warn(`Failed to remove container ${project.containerId}: ${error}`);
            }
        }
        this.nginxService.removeProxyConfig(project.subdomain);
        await this.prisma.project.delete({ where: { id: projectId } });
        this.logger.log(`Project ${projectId} deleted`);
        return { message: `Project ${projectId} deleted successfully` };
    }
    async getProjectStats(projectId) {
        const project = await this.findProjectOrFail(projectId);
        if (!project.containerId) {
            throw new common_1.BadRequestException(`Project ${projectId} has no container assigned`);
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
        }
        catch (error) {
            const msg = error instanceof Error ? error.message : String(error);
            throw new common_1.InternalServerErrorException(`Failed to get container stats: ${msg}`);
        }
    }
    async getProjectLogs(projectId) {
        const project = await this.findProjectOrFail(projectId);
        if (!project.containerId) {
            throw new common_1.BadRequestException(`Project ${projectId} has no container assigned`);
        }
        try {
            const logs = await this.dockerService.getContainerLogs(project.containerId);
            return logs.replace(/[\x00-\x08].{7}/g, '');
        }
        catch (error) {
            const msg = error instanceof Error ? error.message : String(error);
            throw new common_1.InternalServerErrorException(`Failed to get container logs: ${msg}`);
        }
    }
    async findAll(userId) {
        const where = userId ? { userId } : {};
        return this.prisma.project.findMany({
            where,
            include: { databases: true },
            orderBy: { createdAt: 'desc' },
        });
    }
    async findOne(projectId) {
        return this.findProjectOrFail(projectId);
    }
    async getEnvVariables(projectId) {
        await this.findProjectOrFail(projectId);
        return this.prisma.envVariable.findMany({
            where: { projectId },
            orderBy: { createdAt: 'asc' },
        });
    }
    async addEnvVariable(projectId, key, value, isSecret) {
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
        }
        else {
            result = await this.prisma.envVariable.create({
                data: { key, value, isSecret, projectId },
            });
        }
        if (project.containerId) {
            this.logger.log(`Restarting project ${projectId} to apply environment changes...`);
            this.restartProject(projectId).catch(err => {
                this.logger.error(`Failed to restart project for env change: ${err.message}`);
            });
        }
        return result;
    }
    async deleteEnvVariable(projectId, envId) {
        const project = await this.findProjectOrFail(projectId);
        const result = await this.prisma.envVariable.delete({ where: { id: envId } });
        if (project.containerId) {
            this.restartProject(projectId).catch(err => {
                this.logger.error(`Failed to restart project for env deletion: ${err.message}`);
            });
        }
        return result;
    }
    async restartProject(projectId) {
        const project = await this.findProjectOrFail(projectId);
        if (!project.containerId)
            return;
        try {
            if (project.status === 'running') {
                await this.dockerService.stopContainer(project.containerId);
            }
            await this.dockerService.startContainer(project.containerId);
            await this.prisma.project.update({
                where: { id: projectId },
                data: { status: 'running' },
            });
        }
        catch (error) {
            this.logger.error(`Restart failed: ${error.message}`);
            throw error;
        }
    }
    async updateResources(projectId, ramMB, cpuCores) {
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
            }
            catch (error) {
                const msg = error instanceof Error ? error.message : String(error);
                this.logger.warn(`Could not update live container resources: ${msg}`);
            }
        }
        return this.prisma.project.update({
            where: { id: projectId },
            data: { ramLimit: ramMB, cpuLimit: cpuCores },
        });
    }
    async deployFromGit(projectId, gitRepo, branch = 'main') {
        const project = await this.findProjectOrFail(projectId);
        await this.prisma.project.update({
            where: { id: projectId },
            data: { gitRepo, deployBranch: branch, deployStatus: 'deploying' },
        });
        const deployment = await this.prisma.deploymentLog.create({
            data: { projectId, status: 'running', trigger: 'manual' },
        });
        this.runGitDeployBackground(project, deployment.id, gitRepo, branch).catch(err => {
            this.logger.error(`Git deploy failed for project ${projectId}: ${err.message}`);
        });
        return { deploymentId: deployment.id, status: 'deploying', message: 'Deployment started in background' };
    }
    async runGitDeployBackground(project, deploymentId, gitRepo, branch) {
        const startTime = Date.now();
        const tmpDir = path.join(os.tmpdir(), `potato-deploy-${project.id}-${Date.now()}`);
        let logBuffer = '';
        const updateLog = async (msg) => {
            this.logger.log(`[Deploy ${deploymentId}] ${msg}`);
            logBuffer += `${new Date().toISOString()} ${msg}\n`;
            await this.prisma.deploymentLog.update({
                where: { id: deploymentId },
                data: { log: logBuffer },
            }).catch(() => { });
        };
        try {
            let currentContainerId = project.containerId;
            if (!currentContainerId) {
                await updateLog('Phát hiện thiếu chậu trồng (Container). Đang tiến hành tạo chậu mới...');
                const hostPort = await this.allocatePort();
                const containerName = `potato-${project.subdomain}`;
                try {
                    await this.dockerService.pullImage('node:20-alpine');
                }
                catch (e) { }
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
            let cloned = false;
            for (let attempt = 1; attempt <= 3 && !cloned; attempt++) {
                try {
                    if (fs.existsSync(tmpDir)) {
                        fs.rmSync(tmpDir, { recursive: true, force: true });
                    }
                    fs.mkdirSync(tmpDir, { recursive: true });
                    const git = (0, simple_git_1.default)();
                    await git.clone(gitRepo, tmpDir, [
                        '--depth=1',
                        '--branch', branch,
                        '--single-branch',
                        '-c', 'http.postBuffer=104857600',
                        '-c', 'core.compression=0'
                    ]);
                    cloned = true;
                }
                catch (err) {
                    if (attempt === 3)
                        throw err;
                    await updateLog(`Lỗi clone (lần ${attempt}): ${err.message}. Đang thử lại sau 5s...`);
                    await new Promise(r => setTimeout(r, 5000));
                }
            }
            const repoGit = (0, simple_git_1.default)(tmpDir);
            const logResult = await repoGit.log(['-1']);
            const latestCommit = logResult.latest;
            await updateLog(`Đã lấy mã nguồn thành công. Commit: ${latestCommit?.hash?.substring(0, 7)}`);
            const container = this.dockerService.getContainer(currentContainerId);
            await updateLog(`Đang chuyển mã nguồn vào chậu (container)...`);
            const pack = tar.pack(tmpDir);
            await container.putArchive(pack, { path: '/app' });
            await updateLog('Đã chuyển mã nguồn vào /app.');
            await updateLog('Đang bón phân (npm install)... Quá trình này dùng Cache Volume nên sẽ rất nhanh.');
            const exec = await container.exec({
                Cmd: ['sh', '-c', 'cd /app && npm install --no-audit --no-fund --prefer-offline 2>&1'],
                AttachStdout: true,
                AttachStderr: true,
            });
            const execStart = await exec.start({ hijack: true, stdin: false });
            await new Promise((resolve, reject) => {
                execStart.on('data', async (chunk) => {
                    const str = chunk.toString();
                });
                execStart.on('end', resolve);
                execStart.on('error', reject);
            });
            await updateLog('Đã bón phân xong (npm install complete).');
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
        }
        catch (error) {
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
        }
        finally {
            try {
                fs.rmSync(tmpDir, { recursive: true, force: true });
            }
            catch { }
        }
    }
    async getDeployments(projectId) {
        await this.findProjectOrFail(projectId);
        return this.prisma.deploymentLog.findMany({
            where: { projectId },
            orderBy: { createdAt: 'desc' },
            take: 20,
        });
    }
    async findProjectOrFail(projectId) {
        const project = await this.prisma.project.findUnique({
            where: { id: projectId },
            include: { databases: true, envVariables: true },
        });
        if (!project) {
            throw new common_1.NotFoundException(`Project with ID ${projectId} not found`);
        }
        return project;
    }
    async allocatePort() {
        const maxAttempts = 100;
        for (let i = 0; i < maxAttempts; i++) {
            const port = Math.floor(Math.random() * (PORT_RANGE_MAX - PORT_RANGE_MIN + 1)) +
                PORT_RANGE_MIN;
            return port;
        }
        throw new common_1.InternalServerErrorException('Failed to allocate a port after maximum attempts');
    }
};
exports.ProjectsService = ProjectsService;
exports.ProjectsService = ProjectsService = ProjectsService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        docker_service_1.DockerService,
        nginx_service_1.NginxService,
        ssl_service_1.SslService])
], ProjectsService);
//# sourceMappingURL=projects.service.js.map