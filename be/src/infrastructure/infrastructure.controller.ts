import { Controller, Get, Logger } from '@nestjs/common';
import * as fs from 'fs';

/**
 * InfrastructureController — Exposes health-check and infrastructure status endpoints.
 *
 * Base path: /api/infrastructure
 */
@Controller('infrastructure')
export class InfrastructureController {
  private readonly logger = new Logger(InfrastructureController.name);

  /**
   * Docker socket paths by platform.
   * - Linux / macOS: /var/run/docker.sock
   * - Windows:       //./pipe/docker_engine
   */
  private readonly dockerSocketPaths = [
    '/var/run/docker.sock',        // Linux / macOS
    '//./pipe/docker_engine',      // Windows named pipe
  ];

  /**
   * GET /api/infrastructure/health
   *
   * Checks whether the Docker socket is accessible on the host.
   * Returns the socket path used and its accessibility status.
   */
  @Get('health')
  async healthCheck() {
    this.logger.log('GET /infrastructure/health — Running health check');

    const results = this.dockerSocketPaths.map((socketPath) => {
      try {
        fs.accessSync(socketPath, fs.constants.R_OK);
        return { path: socketPath, accessible: true };
      } catch {
        return { path: socketPath, accessible: false };
      }
    });

    const accessible = results.find((r) => r.accessible);

    const status = accessible ? 'healthy' : 'unhealthy';
    const response = {
      status,
      timestamp: new Date().toISOString(),
      checks: {
        dockerSocket: {
          status: accessible ? 'up' : 'down',
          socketPath: accessible?.path ?? 'none',
          details: results,
        },
      },
    };

    if (accessible) {
      this.logger.log(
        `✅ Health check passed — Docker socket accessible at ${accessible.path}`,
      );
    } else {
      this.logger.warn(
        '❌ Health check failed — Docker socket not accessible on any known path',
      );
    }

    return response;
  }
}
