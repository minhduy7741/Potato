import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  MessageBody,
  ConnectedSocket,
} from '@nestjs/websockets';
import { Logger } from '@nestjs/common';
import { Server, Socket } from 'socket.io';
import { PrismaService } from '../prisma/prisma.service';
import { ContainerLogService } from './container-log.service';

@WebSocketGateway({
  cors: {
    origin: '*',
  },
  namespace: '/logs',
})
export class LogsGateway
  implements OnGatewayConnection, OnGatewayDisconnect
{
  private readonly logger = new Logger(LogsGateway.name);

  @WebSocketServer()
  server: Server;

  constructor(
    private readonly prismaService: PrismaService,
    private readonly containerLogService: ContainerLogService,
  ) {}

  /**
   * Lifecycle: client connected.
   */
  handleConnection(client: Socket): void {
    this.logger.log(`Client connected: ${client.id}`);
  }

  /**
   * Lifecycle: client disconnected.
   * Automatically cleans up any active log stream to prevent memory leaks.
   */
  handleDisconnect(client: Socket): void {
    this.logger.log(`Client disconnected: ${client.id}`);
    this.containerLogService.stopStreaming(client.id);
  }

  /**
   * Client requests to join a project room and start receiving logs.
   *
   * Payload: { project_id: string }
   *
   * Flow:
   *   1. Look up the project in the database to get the containerId
   *   2. Validate the container exists and is assigned
   *   3. Join the socket to room `project:<id>`
   *   4. Start streaming logs from the Docker container
   */
  @SubscribeMessage('join_project')
  async handleJoinProject(
    @MessageBody() data: { project_id: number },
    @ConnectedSocket() client: Socket,
  ): Promise<void> {
    const { project_id } = data;
    if (!project_id) {
      this.logger.warn(`Client ${client.id} tried to join an undefined project room`);
      return;
    }
    
    this.logger.log(
      `Client ${client.id} joining project room: ${project_id}`,
    );

    try {
      // Look up the project to get its container ID
      const project = await this.prismaService.project.findUnique({
        where: { id: Number(project_id) },
      });

      if (!project) {
        client.emit('log_error', {
          message: `Project '${project_id}' not found.`,
        });
        return;
      }

      if (!project.containerId) {
        client.emit('log_error', {
          message: `Project '${project_id}' has no container assigned.`,
        });
        return;
      }

      // Join the project room
      const roomName = `project:${project_id}`;
      await client.join(roomName);
      this.logger.log(`Client ${client.id} joined room ${roomName}`);

      // Start streaming container logs to this client
      await this.containerLogService.startStreaming(
        client.id,
        project.containerId,
        client,
      );
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(
        `Error joining project ${project_id}: ${message}`,
      );
      client.emit('log_error', {
        message: `Failed to join project: ${message}`,
      });
    }
  }

  /**
   * Client requests to leave a project room and stop receiving logs.
   *
   * Payload: { project_id: string }
   */
  @SubscribeMessage('leave_project')
  async handleLeaveProject(
    @MessageBody() data: { project_id: number },
    @ConnectedSocket() client: Socket,
  ): Promise<void> {
    const { project_id } = data;
    this.logger.log(
      `Client ${client.id} leaving project room: ${project_id}`,
    );

    // Stop the log stream
    this.containerLogService.stopStreaming(client.id);

    // Leave the room
    const roomName = `project:${project_id}`;
    await client.leave(roomName);
    this.logger.log(`Client ${client.id} left room ${roomName}`);
  }
}
