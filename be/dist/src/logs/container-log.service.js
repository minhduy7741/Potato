"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var ContainerLogService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.ContainerLogService = void 0;
const common_1 = require("@nestjs/common");
const docker_service_1 = require("../docker/docker.service");
const LOG_PREFIX = '[POTATO-GROWTH] ';
let ContainerLogService = ContainerLogService_1 = class ContainerLogService {
    dockerService;
    logger = new common_1.Logger(ContainerLogService_1.name);
    activeStreams = new Map();
    constructor(dockerService) {
        this.dockerService = dockerService;
    }
    async startStreaming(socketId, containerId, client) {
        this.stopStreaming(socketId);
        try {
            const rawStream = await this.dockerService.getContainerLogStream(containerId);
            this.activeStreams.set(socketId, rawStream);
            let buffer = '';
            rawStream.on('data', (chunk) => {
                const data = this.demuxDockerStream(chunk);
                buffer += data;
                const lines = buffer.split('\n');
                buffer = lines.pop() ?? '';
                for (const line of lines) {
                    const trimmed = line.trimEnd();
                    if (trimmed.length > 0) {
                        client.emit('log', `${LOG_PREFIX}${trimmed}`);
                    }
                }
            });
            rawStream.on('error', (err) => {
                this.logger.error(`Stream error for socket ${socketId}: ${err.message}`);
                client.emit('log_error', {
                    message: `Log stream error: ${err.message}`,
                });
                this.stopStreaming(socketId);
            });
            rawStream.on('end', () => {
                this.logger.log(`Stream ended for socket ${socketId}`);
                if (buffer.trim().length > 0) {
                    client.emit('log', `${LOG_PREFIX}${buffer.trim()}`);
                }
                this.activeStreams.delete(socketId);
            });
            this.logger.log(`Started streaming logs for container ${containerId} → socket ${socketId}`);
        }
        catch (error) {
            const message = error instanceof Error ? error.message : 'Unknown error';
            this.logger.error(`Failed to start streaming for socket ${socketId}: ${message}`);
            client.emit('log_error', {
                message: `Failed to attach to container logs: ${message}`,
            });
        }
    }
    stopStreaming(socketId) {
        const stream = this.activeStreams.get(socketId);
        if (stream) {
            stream.destroy();
            this.activeStreams.delete(socketId);
            this.logger.log(`Destroyed stream for socket ${socketId}`);
        }
    }
    onModuleDestroy() {
        this.logger.log(`Cleaning up ${this.activeStreams.size} active stream(s)...`);
        for (const [socketId, stream] of this.activeStreams) {
            stream.destroy();
            this.logger.log(`Destroyed stream for socket ${socketId}`);
        }
        this.activeStreams.clear();
    }
    demuxDockerStream(chunk) {
        const results = [];
        let offset = 0;
        while (offset < chunk.length) {
            if (offset + 8 > chunk.length) {
                results.push(chunk.subarray(offset).toString('utf-8'));
                break;
            }
            const headerByte = chunk[offset];
            if (headerByte <= 2 && chunk[offset + 1] === 0 && chunk[offset + 2] === 0 && chunk[offset + 3] === 0) {
                const payloadSize = chunk.readUInt32BE(offset + 4);
                if (offset + 8 + payloadSize > chunk.length) {
                    results.push(chunk.subarray(offset + 8).toString('utf-8'));
                    break;
                }
                const payload = chunk.subarray(offset + 8, offset + 8 + payloadSize);
                results.push(payload.toString('utf-8'));
                offset += 8 + payloadSize;
            }
            else {
                results.push(chunk.subarray(offset).toString('utf-8'));
                break;
            }
        }
        return results.join('');
    }
};
exports.ContainerLogService = ContainerLogService;
exports.ContainerLogService = ContainerLogService = ContainerLogService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [docker_service_1.DockerService])
], ContainerLogService);
//# sourceMappingURL=container-log.service.js.map