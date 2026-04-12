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
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
var LogsGateway_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.LogsGateway = void 0;
const websockets_1 = require("@nestjs/websockets");
const common_1 = require("@nestjs/common");
const socket_io_1 = require("socket.io");
const prisma_service_1 = require("../prisma/prisma.service");
const container_log_service_1 = require("./container-log.service");
let LogsGateway = LogsGateway_1 = class LogsGateway {
    prismaService;
    containerLogService;
    logger = new common_1.Logger(LogsGateway_1.name);
    server;
    constructor(prismaService, containerLogService) {
        this.prismaService = prismaService;
        this.containerLogService = containerLogService;
    }
    handleConnection(client) {
        this.logger.log(`Client connected: ${client.id}`);
    }
    handleDisconnect(client) {
        this.logger.log(`Client disconnected: ${client.id}`);
        this.containerLogService.stopStreaming(client.id);
    }
    async handleJoinProject(data, client) {
        const { project_id } = data;
        if (!project_id) {
            this.logger.warn(`Client ${client.id} tried to join an undefined project room`);
            return;
        }
        this.logger.log(`Client ${client.id} joining project room: ${project_id}`);
        try {
            const project = await this.prismaService.project.findUnique({
                where: { id: Number(project_id) },
            });
            if (!project) {
                client.emit('log_error', {
                    message: `Project '${project_id}' not found.`,
                });
                return;
            }
            if (!project.containerId) {
                client.emit('log_error', {
                    message: `Project '${project_id}' has no container assigned.`,
                });
                return;
            }
            const roomName = `project:${project_id}`;
            await client.join(roomName);
            this.logger.log(`Client ${client.id} joined room ${roomName}`);
            await this.containerLogService.startStreaming(client.id, project.containerId, client);
        }
        catch (error) {
            const message = error instanceof Error ? error.message : 'Unknown error';
            this.logger.error(`Error joining project ${project_id}: ${message}`);
            client.emit('log_error', {
                message: `Failed to join project: ${message}`,
            });
        }
    }
    async handleLeaveProject(data, client) {
        const { project_id } = data;
        this.logger.log(`Client ${client.id} leaving project room: ${project_id}`);
        this.containerLogService.stopStreaming(client.id);
        const roomName = `project:${project_id}`;
        await client.leave(roomName);
        this.logger.log(`Client ${client.id} left room ${roomName}`);
    }
};
exports.LogsGateway = LogsGateway;
__decorate([
    (0, websockets_1.WebSocketServer)(),
    __metadata("design:type", socket_io_1.Server)
], LogsGateway.prototype, "server", void 0);
__decorate([
    (0, websockets_1.SubscribeMessage)('join_project'),
    __param(0, (0, websockets_1.MessageBody)()),
    __param(1, (0, websockets_1.ConnectedSocket)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, socket_io_1.Socket]),
    __metadata("design:returntype", Promise)
], LogsGateway.prototype, "handleJoinProject", null);
__decorate([
    (0, websockets_1.SubscribeMessage)('leave_project'),
    __param(0, (0, websockets_1.MessageBody)()),
    __param(1, (0, websockets_1.ConnectedSocket)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, socket_io_1.Socket]),
    __metadata("design:returntype", Promise)
], LogsGateway.prototype, "handleLeaveProject", null);
exports.LogsGateway = LogsGateway = LogsGateway_1 = __decorate([
    (0, websockets_1.WebSocketGateway)({
        cors: {
            origin: '*',
        },
        namespace: '/logs',
    }),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        container_log_service_1.ContainerLogService])
], LogsGateway);
//# sourceMappingURL=logs.gateway.js.map