import { PrismaService } from '../prisma/prisma.service';
import { DockerService } from '../docker/docker.service';
export declare class DatabasesService {
    private readonly prisma;
    private readonly docker;
    private readonly logger;
    constructor(prisma: PrismaService, docker: DockerService);
    findAll(): Promise<({
        project: {
            id: number;
            name: string;
            createdAt: Date;
            userId: number;
            containerId: string | null;
            status: string;
            ramLimit: number;
            cpuLimit: number;
            subdomain: string;
            customDomain: string | null;
            sslStatus: string;
            sslExpiry: Date | null;
            gitRepo: string | null;
            deployBranch: string | null;
            deployStatus: string | null;
            lastDeployedAt: Date | null;
        };
    } & {
        id: number;
        name: string;
        createdAt: Date;
        status: string;
        type: string;
        connectionString: string | null;
        projectId: number;
    })[]>;
    create(data: {
        name: string;
        type: string;
        projectId: number;
    }): Promise<{
        id: number;
        name: string;
        createdAt: Date;
        status: string;
        type: string;
        connectionString: string | null;
        projectId: number;
    }>;
    private provisionDatabaseBackground;
    remove(id: number): Promise<{
        success: boolean;
    }>;
    private allocatePort;
}
