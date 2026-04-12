import Dockerode from 'dockerode';
import { Readable } from 'stream';
export declare class DockerService {
    private readonly logger;
    private readonly docker;
    constructor();
    pullImage(imageName: string): Promise<void>;
    createContainer(options: Dockerode.ContainerCreateOptions): Promise<Dockerode.Container>;
    startContainer(containerId: string): Promise<void>;
    stopContainer(containerId: string): Promise<void>;
    removeContainer(containerId: string): Promise<void>;
    getContainer(containerId: string): Dockerode.Container;
    getContainerState(containerId: string): Promise<{
        status: string;
        running: boolean;
    }>;
    getContainerStats(containerId: string): Promise<{
        cpuPercent: number;
        memoryUsageMB: number;
        memoryLimitMB: number;
        memoryPercent: number;
    }>;
    getContainerLogStream(containerId: string, tail?: number): Promise<Readable>;
    getContainerLogs(containerId: string): Promise<string>;
}
