import type { Response } from 'express';
import { DatabasesService } from './databases.service';
import { CreateDatabaseDto } from './dto/create-database.dto';
export declare class DatabasesController {
    private readonly databasesService;
    constructor(databasesService: DatabasesService);
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
    create(createDbDto: CreateDatabaseDto): Promise<{
        id: number;
        name: string;
        createdAt: Date;
        status: string;
        type: string;
        connectionString: string | null;
        projectId: number;
    }>;
    getLogs(id: number): Promise<{
        id: number;
        createdAt: Date;
        status: string;
        databaseId: number;
        action: string;
        filename: string | null;
        message: string | null;
    }[]>;
    remove(id: number): Promise<{
        success: boolean;
    }>;
    changePassword(id: number, newPassword: string): Promise<{
        success: boolean;
        connectionString: string;
    }>;
    importDatabase(id: number, file: Express.Multer.File): Promise<{
        success: boolean;
    }>;
    exportDatabase(id: number, res: Response): Promise<void>;
}
