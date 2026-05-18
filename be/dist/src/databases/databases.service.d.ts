import { PrismaService } from '../prisma/prisma.service';
import { DockerService } from '../docker/docker.service';
export declare class DatabasesService {
    private readonly prisma;
    private readonly docker;
    private readonly logger;
    constructor(prisma: PrismaService, docker: DockerService);
    findAll(): Promise<({
        activityLogs: {
            id: number;
            createdAt: Date;
            status: string;
            databaseId: number;
            action: string;
            filename: string | null;
            message: string | null;
        }[];
        project: {
            id: number;
            name: string;
            createdAt: Date;
            userId: number;
            containerId: string | null;
            status: string;
            ramLimit: number;
            cpuLimit: number;
            hostPort: number | null;
            subdomain: string;
            customDomain: string | null;
            sslStatus: string;
            sslExpiry: Date | null;
            gitRepo: string | null;
            deployBranch: string | null;
            gitToken: string | null;
            deployStatus: string | null;
            lastDeployedAt: Date | null;
            restartPolicy: string;
            autoScale: boolean;
            notificationsEnabled: boolean;
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
    getLogs(id: number): Promise<{
        id: number;
        createdAt: Date;
        status: string;
        databaseId: number;
        action: string;
        filename: string | null;
        message: string | null;
    }[]>;
    changePassword(id: number, newPass: string): Promise<{
        success: boolean;
        connectionString: string;
    }>;
    importDatabase(id: number, filePath: string, originalName?: string): Promise<{
        success: boolean;
    }>;
    exportDatabase(id: number): Promise<string>;
}
