import { Injectable, Logger, Inject, forwardRef } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';
import { DockerService } from '../docker/docker.service';
import { StatsGateway } from './stats.gateway';

@Injectable()
export class StatsCollectorService {
  private readonly logger = new Logger(StatsCollectorService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly dockerService: DockerService,
    @Inject(forwardRef(() => StatsGateway))
    private readonly statsGateway: StatsGateway,
  ) {}

  /**
   * Runs every 5 minutes: collect CPU/RAM stats from all running containers
   * and persist them to the ProjectStat table.
   */
  @Cron(CronExpression.EVERY_5_MINUTES)
  async collectStats() {
    const runningProjects = await this.prisma.project.findMany({
      where: { status: 'running', containerId: { not: null } },
      select: { id: true, containerId: true },
    });

    if (runningProjects.length === 0) return;

    this.logger.log(`Collecting stats for ${runningProjects.length} running project(s)...`);

    const results = await Promise.allSettled(
      runningProjects.map(async (project) => {
        try {
          const stats = await this.dockerService.getContainerStats(project.containerId!);
          // 2. Persist stats to DB
          await this.prisma.projectStat.create({
            data: {
              projectId: project.id,
              cpuUsage: parseFloat(stats.cpuPercent.toFixed(2)),
              ramUsage: parseFloat(stats.memoryUsageMB.toFixed(2)),
            },
          });

          // 3. Auto-Scale Logic
          const projectData = await this.prisma.project.findUnique({
            where: { id: project.id },
            select: { autoScale: true, ramLimit: true, cpuLimit: true, name: true }
          });

          if (projectData?.autoScale && stats.cpuPercent > 80) {
            const newRam = Math.min(projectData.ramLimit + 256, 4096); // Max 4GB
            const newCpu = Math.min(projectData.cpuLimit + 0.5, 4);    // Max 4 Cores

            if (newRam > projectData.ramLimit || newCpu > projectData.cpuLimit) {
              this.logger.log(`🚀 Auto-scaling project "${projectData.name}" (${project.id}) due to high CPU (${stats.cpuPercent.toFixed(1)}%)`);
              
              // Update DB
              await this.prisma.project.update({
                where: { id: project.id },
                data: { ramLimit: newRam, cpuLimit: newCpu }
              });

              // Update Container Live
              await this.dockerService.updateContainerResources(project.containerId!, {
                ramMB: newRam,
                cpuCores: newCpu
              });

              // Log activity
              await this.prisma.activityLog.create({
                data: {
                  projectId: project.id,
                  type: 'AUTO_SCALE',
                  message: `Hệ thống tự động nâng cấp tài nguyên do quá tải CPU (${stats.cpuPercent.toFixed(1)}%). Mức mới: ${newRam}MB RAM, ${newCpu} CPU.`
                }
              });
            }
          } else if (projectData?.autoScale && stats.cpuPercent < 15) {
            const newRam = Math.max(projectData.ramLimit - 256, 256);
            const newCpu = Math.max(projectData.cpuLimit - 0.5, 1.0);

            if (newRam < projectData.ramLimit || newCpu < projectData.cpuLimit) {
              this.logger.log(`📉 Auto-scaling down project "${projectData.name}" (${project.id}) due to low CPU (${stats.cpuPercent.toFixed(1)}%)`);
              
              // Update DB
              await this.prisma.project.update({
                where: { id: project.id },
                data: { ramLimit: newRam, cpuLimit: newCpu }
              });

              // Update Container Live
              await this.dockerService.updateContainerResources(project.containerId!, {
                ramMB: newRam,
                cpuCores: newCpu
              });

              // Log activity
              await this.prisma.activityLog.create({
                data: {
                  projectId: project.id,
                  type: 'AUTO_SCALE',
                  message: `Hệ thống tự động thu hồi tài nguyên do tải CPU thấp (${stats.cpuPercent.toFixed(1)}%). Mức mới: ${newRam}MB RAM, ${newCpu} CPU.`
                }
              });
            }
          }
        } catch (err) {
          this.logger.warn(`Failed to collect stats or scale project ${project.id}: ${err.message}`);
        }
      }),
    );

    const succeeded = results.filter((r) => r.status === 'fulfilled').length;
    this.logger.log(`Stats collected: ${succeeded}/${runningProjects.length} succeeded`);
  }

  /**
   * Runs every day at midnight: purge stats older than 7 days to prevent DB bloat.
   */
  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async purgeOldStats() {
    const cutoff = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const { count } = await this.prisma.projectStat.deleteMany({
      where: { createdAt: { lt: cutoff } },
    });
    if (count > 0) {
      this.logger.log(`Purged ${count} old stat record(s) older than 7 days`);
    }
  }

  /**
   * Returns the last 24h of stats for a given project, bucketed per 5-minute interval.
   */
  async getStats(projectId: number, hours = 24) {
    const since = new Date(Date.now() - hours * 60 * 60 * 1000);
    return this.prisma.projectStat.findMany({
      where: { projectId, createdAt: { gte: since } },
      orderBy: { createdAt: 'asc' },
      select: { cpuUsage: true, ramUsage: true, createdAt: true },
    });
  }

  /**
   * Runs every 3 seconds: query Docker stats ONLY for running projects that have
   * active WebSocket subscribers in their stats rooms, and broadcast to those rooms.
   */
  @Cron('*/3 * * * * *')
  async broadcastRealtimeStats() {
    const server = this.statsGateway.server;
    if (!server) return;

    const runningProjects = await this.prisma.project.findMany({
      where: { status: 'running', containerId: { not: null } },
      select: { id: true, containerId: true },
    });

    for (const project of runningProjects) {
      const roomName = `project-stats:${project.id}`;
      const room = (server as any).adapter.rooms.get(roomName);
      const numSubscribers = room ? room.size : 0;

      if (numSubscribers > 0) {
        try {
          const stats = await this.dockerService.getContainerStats(project.containerId!);
          server.to(roomName).emit('stats_update', {
            projectId: project.id,
            state: 'running',
            running: true,
            cpu: { usagePercent: stats.cpuPercent },
            memory: {
              usagePercent: stats.memoryPercent,
              usageMB: stats.memoryUsageMB,
              limitMB: stats.memoryLimitMB,
            },
          });
        } catch (error: any) {
          if (error.message?.includes('no container')) {
            server.to(roomName).emit('stats_update', {
              cpu: { usagePercent: 0 },
              memory: { usagePercent: 0, usageMb: 0, limitMb: 0 },
            });
          } else {
            this.logger.warn(`Failed to broadcast stats for project ${project.id}: ${error.message}`);
            server.to(roomName).emit('stats_error', { message: 'Không thể lấy thông số dự án' });
          }
        }
      }
    }
  }
}
