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
var StatsCollectorService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.StatsCollectorService = void 0;
const common_1 = require("@nestjs/common");
const schedule_1 = require("@nestjs/schedule");
const prisma_service_1 = require("../prisma/prisma.service");
const docker_service_1 = require("../docker/docker.service");
let StatsCollectorService = StatsCollectorService_1 = class StatsCollectorService {
    prisma;
    dockerService;
    logger = new common_1.Logger(StatsCollectorService_1.name);
    constructor(prisma, dockerService) {
        this.prisma = prisma;
        this.dockerService = dockerService;
    }
    async collectStats() {
        const runningProjects = await this.prisma.project.findMany({
            where: { status: 'running', containerId: { not: null } },
            select: { id: true, containerId: true },
        });
        if (runningProjects.length === 0)
            return;
        this.logger.log(`Collecting stats for ${runningProjects.length} running project(s)...`);
        const results = await Promise.allSettled(runningProjects.map(async (project) => {
            try {
                const stats = await this.dockerService.getContainerStats(project.containerId);
                await this.prisma.projectStat.create({
                    data: {
                        projectId: project.id,
                        cpuUsage: parseFloat(stats.cpuPercent.toFixed(2)),
                        ramUsage: parseFloat(stats.memoryUsageMB.toFixed(2)),
                    },
                });
                const projectData = await this.prisma.project.findUnique({
                    where: { id: project.id },
                    select: { autoScale: true, ramLimit: true, cpuLimit: true, name: true }
                });
                if (projectData?.autoScale && stats.cpuPercent > 80) {
                    const newRam = Math.min(projectData.ramLimit + 256, 4096);
                    const newCpu = Math.min(projectData.cpuLimit + 0.5, 4);
                    if (newRam > projectData.ramLimit || newCpu > projectData.cpuLimit) {
                        this.logger.log(`🚀 Auto-scaling project "${projectData.name}" (${project.id}) due to high CPU (${stats.cpuPercent.toFixed(1)}%)`);
                        await this.prisma.project.update({
                            where: { id: project.id },
                            data: { ramLimit: newRam, cpuLimit: newCpu }
                        });
                        await this.dockerService.updateContainerResources(project.containerId, {
                            ramMB: newRam,
                            cpuCores: newCpu
                        });
                        await this.prisma.activityLog.create({
                            data: {
                                projectId: project.id,
                                type: 'AUTO_SCALE',
                                message: `Hệ thống tự động nâng cấp tài nguyên do quá tải CPU (${stats.cpuPercent.toFixed(1)}%). Mức mới: ${newRam}MB RAM, ${newCpu} CPU.`
                            }
                        });
                    }
                }
            }
            catch (err) {
                this.logger.warn(`Failed to collect stats or scale project ${project.id}: ${err.message}`);
            }
        }));
        const succeeded = results.filter((r) => r.status === 'fulfilled').length;
        this.logger.log(`Stats collected: ${succeeded}/${runningProjects.length} succeeded`);
    }
    async purgeOldStats() {
        const cutoff = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
        const { count } = await this.prisma.projectStat.deleteMany({
            where: { createdAt: { lt: cutoff } },
        });
        if (count > 0) {
            this.logger.log(`Purged ${count} old stat record(s) older than 7 days`);
        }
    }
    async getStats(projectId, hours = 24) {
        const since = new Date(Date.now() - hours * 60 * 60 * 1000);
        return this.prisma.projectStat.findMany({
            where: { projectId, createdAt: { gte: since } },
            orderBy: { createdAt: 'asc' },
            select: { cpuUsage: true, ramUsage: true, createdAt: true },
        });
    }
};
exports.StatsCollectorService = StatsCollectorService;
__decorate([
    (0, schedule_1.Cron)(schedule_1.CronExpression.EVERY_5_MINUTES),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], StatsCollectorService.prototype, "collectStats", null);
__decorate([
    (0, schedule_1.Cron)(schedule_1.CronExpression.EVERY_DAY_AT_MIDNIGHT),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], StatsCollectorService.prototype, "purgeOldStats", null);
exports.StatsCollectorService = StatsCollectorService = StatsCollectorService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        docker_service_1.DockerService])
], StatsCollectorService);
//# sourceMappingURL=stats-collector.service.js.map