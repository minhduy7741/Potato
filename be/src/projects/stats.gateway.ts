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
  private activeIntervals = new Map<string, NodeJS.Timeout>();

  @WebSocketServer()
  server: Server;

  constructor(private readonly projectsService: ProjectsService) {}

  handleDisconnect(client: Socket) {
    this.stopStats(client.id);
  }

  @SubscribeMessage('watch_stats')
  async handleWatchStats(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { projectId: number },
  ) {
    this.stopStats(client.id);

    this.logger.log(`Client ${client.id} watching stats for project ${data.projectId}`);

    // Gửi stats ngay lập tức lần đầu
    await this.sendStats(client, data.projectId);

    // Thiết lập interval mỗi 2 giây
    const interval = setInterval(async () => {
      await this.sendStats(client, data.projectId);
    }, 2000);

    this.activeIntervals.set(client.id, interval);
  }

  @SubscribeMessage('unwatch_stats')
  handleUnwatchStats(@ConnectedSocket() client: Socket) {
    this.stopStats(client.id);
  }

  private async sendStats(client: Socket, projectId: number) {
    try {
      const stats = await this.projectsService.getProjectStats(projectId);
      client.emit('stats_update', stats);
    } catch (error) {
      // Project không có container (ví dụ: seed data hoặc stopped) → emit zeros
      // thay vì báo lỗi liên tục và dừng interval
      if (error.message?.includes('no container')) {
        client.emit('stats_update', {
          cpu: { usagePercent: 0 },
          memory: { usagePercent: 0, usageMb: 0, limitMb: 0 },
        });
      } else {
        this.logger.warn(`Stats unavailable for project ${projectId}: ${error.message}`);
        client.emit('stats_error', { message: 'Không thể lấy thông số dự án' });
        this.stopStats(client.id);
      }
    }
  }

  private stopStats(clientId: string) {
    if (this.activeIntervals.has(clientId)) {
      clearInterval(this.activeIntervals.get(clientId));
      this.activeIntervals.delete(clientId);
    }
  }
}
