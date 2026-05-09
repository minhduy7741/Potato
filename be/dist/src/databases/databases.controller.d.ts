import type { Response } from 'express';
import { DatabasesService } from './databases.service';
import { CreateDatabaseDto } from './dto/create-database.dto';
export declare class DatabasesController {
    private readonly databasesService;
    constructor(databasesService: DatabasesService);
    findAll(): Promise<({
        project: {
            id: number;
            name: string;
            status: string;
            createdAt: Date;
            containerId: string | null;
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
            userId: number;
        };
        activityLogs: {
            id: number;
            status: string;
            createdAt: Date;
            databaseId: number;
            action: string;
            filename: string | null;
            message: string | null;
        }[];
    } & {
        id: number;
        name: string;
        type: string;
        status: string;
        connectionString: string | null;
        projectId: number;
        createdAt: Date;
    })[]>;
    create(createDbDto: CreateDatabaseDto): Promise<{
        id: number;
        name: string;
        type: string;
        status: string;
        connectionString: string | null;
        projectId: number;
        createdAt: Date;
    }>;
    getLogs(id: number): Promise<{
        id: number;
        status: string;
        createdAt: Date;
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
