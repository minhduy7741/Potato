import { OnGatewayDisconnect } from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { ProjectsService } from './projects.service';
export declare class StatsGateway implements OnGatewayDisconnect {
    private readonly projectsService;
    private readonly logger;
    private activeIntervals;
    server: Server;
    constructor(projectsService: ProjectsService);
    handleDisconnect(client: Socket): void;
    handleWatchStats(client: Socket, data: {
        projectId: number;
    }): Promise<void>;
    handleUnwatchStats(client: Socket): void;
    private sendStats;
    private stopStats;
}
