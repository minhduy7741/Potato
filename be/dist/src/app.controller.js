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
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AppController = void 0;
const common_1 = require("@nestjs/common");
const app_service_1 = require("./app.service");
const jwt_auth_guard_1 = require("./auth/jwt-auth.guard");
const prisma_service_1 = require("./prisma/prisma.service");
const os = __importStar(require("os"));
const fs = __importStar(require("fs"));
let AppController = class AppController {
    appService;
    prisma;
    constructor(appService, prisma) {
        this.appService = appService;
        this.prisma = prisma;
    }
    getHello() {
        return { url: 'http://localhost:3001' };
    }
    async getSystemStats(req) {
        if (req.user?.role !== 'ADMIN') {
            throw new common_1.ForbiddenException('Chỉ dành cho quản trị viên hệ thống.');
        }
        const totalRamBytes = os.totalmem();
        const freeRamBytes = os.freemem();
        const usedRamBytes = totalRamBytes - freeRamBytes;
        const totalRamGB = +(totalRamBytes / 1024 ** 3).toFixed(2);
        const usedRamGB = +(usedRamBytes / 1024 ** 3).toFixed(2);
        const freeRamGB = +(freeRamBytes / 1024 ** 3).toFixed(2);
        const ramUsagePercent = +((usedRamBytes / totalRamBytes) * 100).toFixed(1);
        const cpus = os.cpus();
        const cpuModel = cpus[0]?.model ?? 'Unknown CPU';
        const cpuCores = cpus.length;
        const loadAvg = os.loadavg();
        const cpuLoadPercent = +((loadAvg[0] / cpuCores) * 100).toFixed(1);
        let diskTotal = 0;
        let diskFree = 0;
        try {
            const diskPath = process.cwd();
            const stat = fs.statfsSync(diskPath);
            diskTotal = stat.blocks * stat.bsize;
            diskFree = stat.bfree * stat.bsize;
        }
        catch {
            diskTotal = 0;
            diskFree = 0;
        }
        const diskTotalGB = +(diskTotal / 1024 ** 3).toFixed(1);
        const diskFreeGB = +(diskFree / 1024 ** 3).toFixed(1);
        const diskUsedGB = +(diskTotalGB - diskFreeGB).toFixed(1);
        const diskUsagePercent = diskTotal > 0
            ? +((1 - diskFree / diskTotal) * 100).toFixed(1)
            : 0;
        const uptimeSeconds = os.uptime();
        const uptimeDays = Math.floor(uptimeSeconds / 86400);
        const uptimeHours = Math.floor((uptimeSeconds % 86400) / 3600);
        const uptimeMinutes = Math.floor((uptimeSeconds % 3600) / 60);
        const platform = os.platform();
        const platformLabel = platform === 'win32' ? 'Windows' :
            platform === 'linux' ? 'Linux' :
                platform === 'darwin' ? 'macOS' : platform;
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
};
exports.AppController = AppController;
__decorate([
    (0, common_1.Get)(),
    (0, common_1.Redirect)('http://localhost:3001', 301),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], AppController.prototype, "getHello", null);
__decorate([
    (0, common_1.Get)('admin/system-stats'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    __param(0, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], AppController.prototype, "getSystemStats", null);
exports.AppController = AppController = __decorate([
    (0, common_1.Controller)(),
    __metadata("design:paramtypes", [app_service_1.AppService,
        prisma_service_1.PrismaService])
], AppController);
//# sourceMappingURL=app.controller.js.map