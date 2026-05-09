import { PrismaService } from '../prisma/prisma.service';
import { DockerService } from '../docker/docker.service';
export declare class StatsCollectorService {
    private readonly prisma;
    private readonly dockerService;
    private readonly logger;
    constructor(prisma: PrismaService, dockerService: DockerService);
    collectStats(): Promise<void>;
    purgeOldStats(): Promise<void>;
    getStats(projectId: number, hours?: number): Promise<{
        createdAt: Date;
        cpuUsage: number;
        ramUsage: number;
    }[]>;
}
