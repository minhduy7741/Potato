import { Injectable, Logger, Inject, forwardRef } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';
import { DockerService } from '../docker/docker.service';
import { StatsGateway } from './stats.gateway';
import { ProjectsService } from './projects.service';

@Injectable()
export class StatsCollectorService {
  private readonly logger = new Logger(StatsCollectorService.name);

  // Maps to track when threshold was first exceeded (projectId -> timestamp)
  private firstCpuExceeded = new Map<number, number>();
  private firstRamExceeded = new Map<number, number>();
  private firstDiskExceeded = new Map<number, number>();

  // Maps to track if alert was already sent (projectId -> boolean)
  private cpuAlerted = new Map<number, boolean>();
  private ramAlerted = new Map<number, boolean>();
  private diskAlerted = new Map<number, boolean>();

  constructor(
    private readonly prisma: PrismaService,
    private readonly dockerService: DockerService,
    @Inject(forwardRef(() => StatsGateway))
    private readonly statsGateway: StatsGateway,
    @Inject(forwardRef(() => ProjectsService))
    private readonly projectsService: ProjectsService,
  ) {}

  /**
   * Runs every minute: collect CPU/RAM stats from all running containers,
   * check resources threshold, trigger auto-scaling, and send Slack alerts if thresholds are exceeded.
   */
  @Cron(CronExpression.EVERY_MINUTE)
  async collectStats() {
    const runningProjects = await this.prisma.project.findMany({
      where: { status: 'running', containerId: { not: null } },
      select: { id: true, containerId: true },
    });

    if (runningProjects.length === 0) return;

    this.logger.log(`Collecting stats for ${runningProjects.length} running project(s)...`);

    // Check host disk space
    let diskPercent = 0;
    try {
      const fs = require('fs');
      const stats = await fs.promises.statfs('.');
      const total = stats.bsize * stats.blocks;
      const free = stats.bsize * stats.bfree;
      const used = total - free;
      diskPercent = (used / total) * 100;
    } catch (err: any) {
      this.logger.warn(`Failed to check disk space: ${err.message}`);
    }

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

          // Fetch project settings details
          const projectData = await this.prisma.project.findUnique({
            where: { id: project.id },
            select: { autoScale: true, ramLimit: true, cpuLimit: true, name: true, slackWebhook: true, alertInterval: true }
          });

          if (!projectData) return;

          const alertMinutes = projectData.alertInterval || 5;
          const thresholdMs = alertMinutes * 60 * 1000;

          // 3. Threshold Checks (CPU > 100% relative capacity or absolute, RAM > 95% capacity, Disk > 75%)
          const isCpuExceeded = stats.cpuPercent >= (projectData.cpuLimit * 95) || stats.cpuPercent > 100;
          const isRamExceeded = stats.memoryPercent >= 95;

          // CPU Alert Logic
          if (isCpuExceeded) {
            if (!this.firstCpuExceeded.has(project.id)) {
              this.firstCpuExceeded.set(project.id, Date.now());
            } else {
              const duration = Date.now() - this.firstCpuExceeded.get(project.id)!;
              if (duration >= thresholdMs && !this.cpuAlerted.get(project.id)) {
                this.cpuAlerted.set(project.id, true);
                if (projectData.slackWebhook) {
                  await this.projectsService.sendSlackAlert(
                    projectData.slackWebhook,
                    projectData.name,
                    'warning',
                    `⚠️ *Cảnh báo tài nguyên:* Chỉ số CPU của dự án vượt quá ngưỡng cho phép (${stats.cpuPercent.toFixed(1)}% / giới hạn ${projectData.cpuLimit * 100}%) liên tục trong hơn ${alertMinutes} phút!`
                  );
                }
              }
            }
          } else {
            if (this.cpuAlerted.get(project.id)) {
              if (projectData.slackWebhook) {
                await this.projectsService.sendSlackAlert(
                  projectData.slackWebhook,
                  projectData.name,
                  'success',
                  `✅ *Phục hồi tài nguyên:* Chỉ số CPU của dự án đã trở lại mức bình thường (${stats.cpuPercent.toFixed(1)}%).`
                );
              }
            }
            this.firstCpuExceeded.delete(project.id);
            this.cpuAlerted.delete(project.id);
          }

          // RAM Alert Logic
          if (isRamExceeded) {
            if (!this.firstRamExceeded.has(project.id)) {
              this.firstRamExceeded.set(project.id, Date.now());
            } else {
              const duration = Date.now() - this.firstRamExceeded.get(project.id)!;
              if (duration >= thresholdMs && !this.ramAlerted.get(project.id)) {
                this.ramAlerted.set(project.id, true);
                if (projectData.slackWebhook) {
                  await this.projectsService.sendSlackAlert(
                    projectData.slackWebhook,
                    projectData.name,
                    'warning',
                    `⚠️ *Cảnh báo tài nguyên:* Chỉ số RAM của dự án vượt quá 95% dung lượng cấp phát (${stats.memoryPercent.toFixed(1)}% - ${stats.memoryUsageMB.toFixed(1)}MB / ${stats.memoryLimitMB.toFixed(1)}MB) liên tục trong hơn ${alertMinutes} phút!`
                  );
                }
              }
            }
          } else {
            if (this.ramAlerted.get(project.id)) {
              if (projectData.slackWebhook) {
                await this.projectsService.sendSlackAlert(
                  projectData.slackWebhook,
                  projectData.name,
                  'success',
                  `✅ *Phục hồi tài nguyên:* Chỉ số RAM của dự án đã trở lại mức bình thường (${stats.memoryPercent.toFixed(1)}%).`
                );
              }
            }
            this.firstRamExceeded.delete(project.id);
            this.ramAlerted.delete(project.id);
          }

          // Disk Alert Logic (> 75% for custom threshold)
          if (diskPercent > 75) {
            if (!this.firstDiskExceeded.has(project.id)) {
              this.firstDiskExceeded.set(project.id, Date.now());
            } else {
              const duration = Date.now() - this.firstDiskExceeded.get(project.id)!;
              if (duration >= thresholdMs && !this.diskAlerted.get(project.id)) {
                this.diskAlerted.set(project.id, true);
                if (projectData.slackWebhook) {
                  await this.projectsService.sendSlackAlert(
                    projectData.slackWebhook,
                    projectData.name,
                    'warning',
                    `⚠️ *Cảnh báo hệ thống:* Dung lượng ổ đĩa của Host đã sử dụng vượt quá 75% (${diskPercent.toFixed(1)}%) liên tục trong hơn ${alertMinutes} phút!`
                  );
                }
              }
            }
          } else {
            if (this.diskAlerted.get(project.id)) {
              if (projectData.slackWebhook) {
                await this.projectsService.sendSlackAlert(
                  projectData.slackWebhook,
                  projectData.name,
                  'success',
                  `✅ *Phục hồi hệ thống:* Dung lượng ổ đĩa của Host đã giảm xuống mức an toàn (${diskPercent.toFixed(1)}%).`
                );
              }
            }
            this.firstDiskExceeded.delete(project.id);
            this.diskAlerted.delete(project.id);
          }

          // 4. Auto-Scale Logic
          if (projectData.autoScale && stats.cpuPercent > 80) {
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
              const scaleMsg = `Hệ thống tự động nâng cấp tài nguyên do quá tải CPU (${stats.cpuPercent.toFixed(1)}%). Mức mới: ${newRam}MB RAM, ${newCpu} CPU.`;
              await this.prisma.activityLog.create({
                data: {
                  projectId: project.id,
                  type: 'AUTO_SCALE',
                  message: scaleMsg
                }
              });

              // Send Slack alert for AutoScale event
              if (projectData.slackWebhook) {
                await this.projectsService.sendSlackAlert(
                  projectData.slackWebhook,
                  projectData.name,
                  'success',
                  `🚀 *Thông báo Auto-scale:* ${scaleMsg}`
                );
              }
            }
          } else if (projectData.autoScale && stats.cpuPercent < 15) {
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
              const scaleDownMsg = `Hệ thống tự động thu hồi tài nguyên do tải CPU thấp (${stats.cpuPercent.toFixed(1)}%). Mức mới: ${newRam}MB RAM, ${newCpu} CPU.`;
              await this.prisma.activityLog.create({
                data: {
                  projectId: project.id,
                  type: 'AUTO_SCALE',
                  message: scaleDownMsg
                }
              });

              // Send Slack alert for AutoScale event
              if (projectData.slackWebhook) {
                await this.projectsService.sendSlackAlert(
                  projectData.slackWebhook,
                  projectData.name,
                  'success',
                  `📉 *Thông báo Auto-scale:* ${scaleDownMsg}`
                );
              }
            }
          }
        } catch (err: any) {
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
