import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { ProjectsService } from './projects.service';
import { Logger } from '@nestjs/common';

@WebSocketGateway({
  cors: { origin: '*' },
  namespace: '/stats',
})
export class StatsGateway implements OnGatewayDisconnect {
  private readonly logger = new Logger(StatsGateway.name);

  @WebSocketServer()
  server: Server;

  constructor(private readonly projectsService: ProjectsService) {}

  handleDisconnect(client: Socket) {
    this.logger.log(`Client ${client.id} disconnected from stats gateway`);
  }

  @SubscribeMessage('watch_stats')
  async handleWatchStats(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { projectId: number },
  ) {
    // Leave previous project stats rooms
    for (const room of client.rooms) {
      if (room.startsWith('project-stats:')) {
        client.leave(room);
      }
    }

    this.logger.log(`Client ${client.id} joined stats room for project ${data.projectId}`);
    client.join(`project-stats:${data.projectId}`);

    // Send initial stats immediately
    try {
      const stats = await this.projectsService.getProjectStats(data.projectId);
      client.emit('stats_update', stats);
    } catch (error: any) {
      if (error.message?.includes('no container')) {
        client.emit('stats_update', {
          cpu: { usagePercent: 0 },
          memory: { usagePercent: 0, usageMb: 0, limitMb: 0 },
        });
      } else {
        client.emit('stats_error', { message: 'Không thể lấy thông số dự án' });
      }
    }
  }

  @SubscribeMessage('unwatch_stats')
  handleUnwatchStats(@ConnectedSocket() client: Socket) {
    for (const room of client.rooms) {
      if (room.startsWith('project-stats:')) {
        client.leave(room);
        this.logger.log(`Client ${client.id} left stats room: ${room}`);
      }
    }
  }
}
