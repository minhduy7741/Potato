import { ProjectsService } from './projects.service';
import { CreateProjectDto } from './dto/create-project.dto';
import { CreateEnvVariableDto } from './dto/create-env-variable.dto';
import { UpdateResourcesDto } from './dto/update-resources.dto';
import { GitDeployDto } from './dto/git-deploy.dto';
export declare class ProjectsController {
    private readonly projectsService;
    private readonly logger;
    constructor(projectsService: ProjectsService);
    create(createProjectDto: CreateProjectDto): Promise<{
        port: number;
        url: string;
        proxyUrl: string;
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
    }>;
    findAll(): Promise<({
        databases: {
            id: number;
            name: string;
            createdAt: Date;
            status: string;
            type: string;
            connectionString: string | null;
            projectId: number;
        }[];
    } & {
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
    })[]>;
    findOne(id: number): Promise<{
        databases: {
            id: number;
            name: string;
            createdAt: Date;
            status: string;
            type: string;
            connectionString: string | null;
            projectId: number;
        }[];
        envVariables: {
            id: number;
            createdAt: Date;
            projectId: number;
            key: string;
            value: string;
            isSecret: boolean;
        }[];
    } & {
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
    }>;
    getStats(id: number): Promise<{
        projectId: number;
        projectName: string;
        containerId: string;
        state: string;
        running: boolean;
        cpu: {
            usagePercent: number;
        };
        memory: {
            usageMB: number;
            limitMB: number;
            usagePercent: number;
        };
    }>;
    start(id: number): Promise<{
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
    }>;
    stop(id: number): Promise<{
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
    }>;
    remove(id: number): Promise<{
        message: string;
    }>;
    updateDomain(id: number, customDomain: string): Promise<{
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
    }>;
    enableSsl(id: number): Promise<{
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
    }>;
    downloadLogs(id: number): Promise<{
        filename: string;
        content: string;
    }>;
    getEnvVariables(id: number): Promise<{
        id: number;
        createdAt: Date;
        projectId: number;
        key: string;
        value: string;
        isSecret: boolean;
    }[]>;
    addEnvVariable(id: number, dto: CreateEnvVariableDto): Promise<any>;
    deleteEnvVariable(id: number, envId: number): Promise<{
        id: number;
        createdAt: Date;
        projectId: number;
        key: string;
        value: string;
        isSecret: boolean;
    }>;
    updateResources(id: number, dto: UpdateResourcesDto): Promise<{
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
    }>;
    deploy(id: number, dto: GitDeployDto): Promise<{
        deploymentId: number;
        status: string;
        message: string;
    }>;
    getDeployments(id: number): Promise<{
        log: string | null;
        id: number;
        createdAt: Date;
        status: string;
        projectId: number;
        trigger: string;
        gitCommit: string | null;
        gitMessage: string | null;
        duration: number | null;
    }[]>;
}
