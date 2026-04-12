import { OnModuleDestroy } from '@nestjs/common';
import { Socket } from 'socket.io';
import { DockerService } from '../docker/docker.service';
export declare class ContainerLogService implements OnModuleDestroy {
    private readonly dockerService;
    private readonly logger;
    private readonly activeStreams;
    constructor(dockerService: DockerService);
    startStreaming(socketId: string, containerId: string, client: Socket): Promise<void>;
    stopStreaming(socketId: string): void;
    onModuleDestroy(): void;
    private demuxDockerStream;
}
