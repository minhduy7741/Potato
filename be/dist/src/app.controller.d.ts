import { AppService } from './app.service';
import { PrismaService } from './prisma/prisma.service';
export declare class AppController {
    private readonly appService;
    private readonly prisma;
    constructor(appService: AppService, prisma: PrismaService);
    getHello(): {
        url: string;
    };
    getSystemStats(req: any): Promise<{
        ram: {
            totalGB: number;
            usedGB: number;
            freeGB: number;
            usagePercent: number;
        };
        cpu: {
            model: string;
            cores: number;
            loadAvg1m: number;
            loadAvg5m: number;
            usagePercent: number;
        };
        disk: {
            totalGB: number;
            usedGB: number;
            freeGB: number;
            usagePercent: number;
        };
        system: {
            platform: string;
            uptime: {
                days: number;
                hours: number;
                minutes: number;
            };
        };
        platform: {
            totalUsers: number;
            totalProjects: number;
            runningProjects: number;
            totalDatabases: number;
        };
    }>;
}
