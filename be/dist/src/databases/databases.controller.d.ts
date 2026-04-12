import { DatabasesService } from './databases.service';
import { CreateDatabaseDto } from './dto/create-database.dto';
export declare class DatabasesController {
    private readonly databasesService;
    constructor(databasesService: DatabasesService);
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
    create(createDbDto: CreateDatabaseDto): Promise<{
        id: number;
        name: string;
        createdAt: Date;
        status: string;
        type: string;
        connectionString: string | null;
        projectId: number;
    }>;
    remove(id: number): Promise<{
        success: boolean;
    }>;
}
