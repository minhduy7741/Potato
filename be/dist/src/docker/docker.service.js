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
var DockerService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.DockerService = void 0;
const common_1 = require("@nestjs/common");
const dockerode_1 = __importDefault(require("dockerode"));
const tar = __importStar(require("tar-fs"));
let DockerService = DockerService_1 = class DockerService {
    logger = new common_1.Logger(DockerService_1.name);
    docker;
    constructor() {
        this.docker = new dockerode_1.default();
        this.logger.log('🥔 Docker Engine connected via socket');
    }
    async pullImage(imageName) {
        this.logger.log(`Pulling image: ${imageName}...`);
        return new Promise((resolve, reject) => {
            this.docker.pull(imageName, (err, stream) => {
                if (err) {
                    this.logger.error(`Failed to pull image ${imageName}: ${err.message}`);
                    return reject(err);
                }
                this.docker.modem.followProgress(stream, (followErr) => {
                    if (followErr) {
                        this.logger.error(`Pull progress error for ${imageName}: ${followErr.message}`);
                        return reject(followErr);
                    }
                    this.logger.log(`Successfully pulled image: ${imageName}`);
                    resolve();
                });
            });
        });
    }
    async buildImage(contextDir, imageName, onProgress) {
        this.logger.log(`Building image ${imageName} from ${contextDir}...`);
        return new Promise((resolve, reject) => {
            const tarStream = tar.pack(contextDir);
            this.docker.buildImage(tarStream, { t: imageName }, (err, stream) => {
                if (err || !stream) {
                    this.logger.error(`Failed to start build for ${imageName}: ${err?.message || 'No stream'}`);
                    return reject(err || new Error('No stream returned from buildImage'));
                }
                this.docker.modem.followProgress(stream, (followErr, res) => {
                    if (followErr) {
                        this.logger.error(`Build progress error for ${imageName}: ${followErr.message}`);
                        return reject(followErr);
                    }
                    this.logger.log(`Successfully built image: ${imageName}`);
                    resolve();
                }, (progress) => {
                    if (progress.stream && onProgress) {
                        const msg = progress.stream.trim();
                        if (msg)
                            onProgress(msg);
                    }
                });
            });
        });
    }
    async inspectImage(imageName) {
        const image = this.docker.getImage(imageName);
        return image.inspect();
    }
    async createContainer(options) {
        this.logger.log(`Creating container: ${options.name || 'unnamed'}`);
        const container = await this.docker.createContainer(options);
        this.logger.log(`Container created: ${container.id.substring(0, 12)}`);
        return container;
    }
    async startContainer(containerId) {
        const container = this.docker.getContainer(containerId);
        await container.start();
        this.logger.log(`Container started: ${containerId.substring(0, 12)}`);
    }
    async stopContainer(containerId) {
        const container = this.docker.getContainer(containerId);
        await container.stop({ t: 10 });
        this.logger.log(`Container stopped: ${containerId.substring(0, 12)}`);
    }
    async restartContainer(containerId) {
        const container = this.docker.getContainer(containerId);
        await container.restart();
        this.logger.log(`Container restarted: ${containerId.substring(0, 12)}`);
    }
    async removeContainer(containerId) {
        const container = this.getContainer(containerId);
        await container.remove({ force: true });
        this.logger.log(`Container removed: ${containerId.substring(0, 12)}`);
    }
    getContainer(containerId) {
        return this.docker.getContainer(containerId);
    }
    async getContainerState(containerId) {
        const container = this.docker.getContainer(containerId);
        const info = await container.inspect();
        return {
            status: info.State.Status,
            running: info.State.Running,
        };
    }
    async getContainerStats(containerId) {
        const container = this.docker.getContainer(containerId);
        const stats = (await container.stats({ stream: false }));
        const cpuDelta = stats.cpu_stats.cpu_usage.total_usage -
            stats.precpu_stats.cpu_usage.total_usage;
        const systemDelta = stats.cpu_stats.system_cpu_usage -
            stats.precpu_stats.system_cpu_usage;
        const numCpus = stats.cpu_stats.online_cpus || 1;
        let cpuPercent = 0;
        if (systemDelta > 0 && cpuDelta > 0) {
            cpuPercent = (cpuDelta / systemDelta) * numCpus * 100;
        }
        const memoryUsageMB = (stats.memory_stats.usage || 0) / (1024 * 1024);
        const memoryLimitMB = (stats.memory_stats.limit || 0) / (1024 * 1024);
        const memoryPercent = memoryLimitMB > 0 ? (memoryUsageMB / memoryLimitMB) * 100 : 0;
        return {
            cpuPercent: Math.round(cpuPercent * 100) / 100,
            memoryUsageMB: Math.round(memoryUsageMB * 100) / 100,
            memoryLimitMB: Math.round(memoryLimitMB * 100) / 100,
            memoryPercent: Math.round(memoryPercent * 100) / 100,
        };
    }
    async getContainerLogStream(containerId, tail = 50) {
        const container = this.getContainer(containerId);
        const logStream = (await container.logs({
            follow: true,
            stdout: true,
            stderr: true,
            tail: tail,
            timestamps: true,
        }));
        this.logger.log(`Attached to log stream for container ${containerId.substring(0, 12)}`);
        return logStream;
    }
    async getContainerLogs(containerId) {
        const container = this.getContainer(containerId);
        const logs = await container.logs({
            stdout: true,
            stderr: true,
            tail: 1000,
            timestamps: true,
        });
        return logs.toString();
    }
    async getUsedHostPorts() {
        const containers = await this.docker.listContainers({ all: true });
        const usedPorts = new Set();
        for (const container of containers) {
            for (const portBinding of container.Ports || []) {
                if (portBinding.PublicPort) {
                    usedPorts.add(portBinding.PublicPort);
                }
            }
        }
        this.logger.log(`Found ${usedPorts.size} host ports already in use by Docker`);
        return usedPorts;
    }
    async listContainers(options) {
        return this.docker.listContainers(options);
    }
    async updateContainerResources(containerId, resources) {
        const container = this.getContainer(containerId);
        return container.update({
            NanoCPUs: Math.floor(resources.cpuCores * 1000000000),
            Memory: resources.ramMB * 1024 * 1024,
            MemorySwap: resources.ramMB * 1024 * 1024,
        });
    }
};
exports.DockerService = DockerService;
exports.DockerService = DockerService = DockerService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [])
], DockerService);
//# sourceMappingURL=docker.service.js.map