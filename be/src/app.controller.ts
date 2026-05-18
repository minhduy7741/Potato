import { Controller, Get, Redirect, UseGuards, Request, ForbiddenException } from '@nestjs/common';
import { AppService } from './app.service';
import { JwtAuthGuard } from './auth/jwt-auth.guard';
import { PrismaService } from './prisma/prisma.service';
import * as os from 'os';
import * as fs from 'fs';

@Controller()
export class AppController {
  constructor(
    private readonly appService: AppService,
    private readonly prisma: PrismaService,
  ) {}

  @Get()
  @Redirect('http://localhost:3001', 301)
  getHello() {
    return { url: 'http://localhost:3001' };
  }

  /**
   * GET /api/admin/system-stats
   * Trả về thông số tài nguyên thực tế của máy chủ Host.
   * Chỉ dành cho tài khoản có quyền ADMIN.
   */
  @Get('admin/system-stats')
  @UseGuards(JwtAuthGuard)
  async getSystemStats(@Request() req: any) {
    if (req.user?.role !== 'ADMIN') {
      throw new ForbiddenException('Chỉ dành cho quản trị viên hệ thống.');
    }

    // ── RAM ──────────────────────────────────────────
    const totalRamBytes = os.totalmem();
    const freeRamBytes = os.freemem();
    const usedRamBytes = totalRamBytes - freeRamBytes;
    const totalRamGB = +(totalRamBytes / 1024 ** 3).toFixed(2);
    const usedRamGB = +(usedRamBytes / 1024 ** 3).toFixed(2);
    const freeRamGB = +(freeRamBytes / 1024 ** 3).toFixed(2);
    const ramUsagePercent = +((usedRamBytes / totalRamBytes) * 100).toFixed(1);

    // ── CPU ──────────────────────────────────────────
    const cpus = os.cpus();
    const cpuModel = cpus[0]?.model ?? 'Unknown CPU';
    const cpuCores = cpus.length;
    const loadAvg = os.loadavg(); // [1min, 5min, 15min]
    const cpuLoadPercent = +((loadAvg[0] / cpuCores) * 100).toFixed(1);

    // ── DISK ─────────────────────────────────────────
    let diskTotal = 0;
    let diskFree = 0;
    try {
      // Tự động lấy ổ đĩa chứa thư mục chạy dự án thực tế (ví dụ: C:, D:, E:...)
      const diskPath = process.cwd();
      const stat = (fs as any).statfsSync(diskPath);
      diskTotal = stat.blocks * stat.bsize;
      diskFree = stat.bfree * stat.bsize;
    } catch {
      // Fallback: estimate from process cwd if statfsSync unavailable
      diskTotal = 0;
      diskFree = 0;
    }
    const diskTotalGB = +(diskTotal / 1024 ** 3).toFixed(1);
    const diskFreeGB = +(diskFree / 1024 ** 3).toFixed(1);
    const diskUsedGB = +(diskTotalGB - diskFreeGB).toFixed(1);
    const diskUsagePercent = diskTotal > 0
      ? +((1 - diskFree / diskTotal) * 100).toFixed(1)
      : 0;

    // ── SYSTEM INFO ──────────────────────────────────
    const uptimeSeconds = os.uptime();
    const uptimeDays = Math.floor(uptimeSeconds / 86400);
    const uptimeHours = Math.floor((uptimeSeconds % 86400) / 3600);
    const uptimeMinutes = Math.floor((uptimeSeconds % 3600) / 60);

    const platform = os.platform(); // 'win32', 'linux', 'darwin'
    const platformLabel =
      platform === 'win32' ? 'Windows' :
      platform === 'linux' ? 'Linux' :
      platform === 'darwin' ? 'macOS' : platform;

    // ── DATABASE STATS ───────────────────────────────
    const [totalUsers, totalProjects, runningProjects, totalDatabases] = await Promise.all([
      this.prisma.user.count(),
      this.prisma.project.count(),
      this.prisma.project.count({ where: { status: 'running' } }),
      this.prisma.databaseInstance.count(),
    ]);

    return {
      ram: { totalGB: totalRamGB, usedGB: usedRamGB, freeGB: freeRamGB, usagePercent: ramUsagePercent },
      cpu: { model: cpuModel, cores: cpuCores, loadAvg1m: +loadAvg[0].toFixed(2), loadAvg5m: +loadAvg[1].toFixed(2), usagePercent: Math.min(cpuLoadPercent, 100) },
      disk: { totalGB: diskTotalGB, usedGB: diskUsedGB, freeGB: diskFreeGB, usagePercent: diskUsagePercent },
      system: { platform: platformLabel, uptime: { days: uptimeDays, hours: uptimeHours, minutes: uptimeMinutes } },
      platform: { totalUsers, totalProjects, runningProjects, totalDatabases },
    };
  }
}
