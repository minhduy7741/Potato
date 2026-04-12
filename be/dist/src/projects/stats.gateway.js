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
var StatsGateway_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.StatsGateway = void 0;
const websockets_1 = require("@nestjs/websockets");
const socket_io_1 = require("socket.io");
const projects_service_1 = require("./projects.service");
const common_1 = require("@nestjs/common");
let StatsGateway = StatsGateway_1 = class StatsGateway {
    projectsService;
    logger = new common_1.Logger(StatsGateway_1.name);
    activeIntervals = new Map();
    server;
    constructor(projectsService) {
        this.projectsService = projectsService;
    }
    handleDisconnect(client) {
        this.stopStats(client.id);
    }
    async handleWatchStats(client, data) {
        this.stopStats(client.id);
        this.logger.log(`Client ${client.id} watching stats for project ${data.projectId}`);
        await this.sendStats(client, data.projectId);
        const interval = setInterval(async () => {
            await this.sendStats(client, data.projectId);
        }, 2000);
        this.activeIntervals.set(client.id, interval);
    }
    handleUnwatchStats(client) {
        this.stopStats(client.id);
    }
    async sendStats(client, projectId) {
        try {
            const stats = await this.projectsService.getProjectStats(projectId);
            client.emit('stats_update', stats);
        }
        catch (error) {
            if (error.message?.includes('no container')) {
                client.emit('stats_update', {
                    cpu: { usagePercent: 0 },
                    memory: { usagePercent: 0, usageMb: 0, limitMb: 0 },
                });
            }
            else {
                this.logger.warn(`Stats unavailable for project ${projectId}: ${error.message}`);
                client.emit('stats_error', { message: 'Không thể lấy thông số dự án' });
                this.stopStats(client.id);
            }
        }
    }
    stopStats(clientId) {
        if (this.activeIntervals.has(clientId)) {
            clearInterval(this.activeIntervals.get(clientId));
            this.activeIntervals.delete(clientId);
        }
    }
};
exports.StatsGateway = StatsGateway;
__decorate([
    (0, websockets_1.WebSocketServer)(),
    __metadata("design:type", socket_io_1.Server)
], StatsGateway.prototype, "server", void 0);
__decorate([
    (0, websockets_1.SubscribeMessage)('watch_stats'),
    __param(0, (0, websockets_1.ConnectedSocket)()),
    __param(1, (0, websockets_1.MessageBody)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [socket_io_1.Socket, Object]),
    __metadata("design:returntype", Promise)
], StatsGateway.prototype, "handleWatchStats", null);
__decorate([
    (0, websockets_1.SubscribeMessage)('unwatch_stats'),
    __param(0, (0, websockets_1.ConnectedSocket)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [socket_io_1.Socket]),
    __metadata("design:returntype", void 0)
], StatsGateway.prototype, "handleUnwatchStats", null);
exports.StatsGateway = StatsGateway = StatsGateway_1 = __decorate([
    (0, websockets_1.WebSocketGateway)({
        cors: { origin: '*' },
        namespace: '/stats',
    }),
    __metadata("design:paramtypes", [projects_service_1.ProjectsService])
], StatsGateway);
//# sourceMappingURL=stats.gateway.js.map