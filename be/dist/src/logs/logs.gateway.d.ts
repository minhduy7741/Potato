import { OnGatewayConnection, OnGatewayDisconnect } from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { PrismaService } from '../prisma/prisma.service';
import { ContainerLogService } from './container-log.service';
export declare class LogsGateway implements OnGatewayConnection, OnGatewayDisconnect {
    private readonly prismaService;
    private readonly containerLogService;
    private readonly logger;
    server: Server;
    constructor(prismaService: PrismaService, containerLogService: ContainerLogService);
    handleConnection(client: Socket): void;
    handleDisconnect(client: Socket): void;
    handleJoinProject(data: {
        project_id: number;
    }, client: Socket): Promise<void>;
    handleLeaveProject(data: {
        project_id: number;
    }, client: Socket): Promise<void>;
}
