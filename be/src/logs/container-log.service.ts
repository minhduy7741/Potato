import {
  Injectable,
  Logger,
  OnModuleDestroy,
} from '@nestjs/common';
import { Socket } from 'socket.io';
import { Readable } from 'stream';
import { DockerService } from '../docker/docker.service';

const LOG_PREFIX = '[POTATO-GROWTH] ';

@Injectable()
export class ContainerLogService implements OnModuleDestroy {
  private readonly logger = new Logger(ContainerLogService.name);

  /** Active log streams keyed by socket ID */
  private readonly activeStreams = new Map<string, Readable>();

  constructor(private readonly dockerService: DockerService) {}

  /**
   * Starts streaming logs from a Docker container to a Socket.io client.
   *
   * Attaches to the container's log stream, demultiplexes the Docker
   * stream header frames, prefixes each line with [POTATO-GROWTH],
   * and emits 'log' events to the client socket.
   *
   * @param socketId - The client's socket ID (used for tracking & cleanup)
   * @param containerId - The Docker container ID
   * @param client - The Socket.io client socket
   */
  async startStreaming(
    socketId: string,
    containerId: string,
    client: Socket,
  ): Promise<void> {
    // Stop any existing stream for this socket before starting a new one
    this.stopStreaming(socketId);

    try {
      const rawStream =
        await this.dockerService.getContainerLogStream(containerId);

      this.activeStreams.set(socketId, rawStream);

      let buffer = '';

      rawStream.on('data', (chunk: Buffer) => {
        // Docker multiplexed stream: each frame has an 8-byte header
        // Byte 0: stream type (1=stdout, 2=stderr)
        // Bytes 4-7: frame payload size (big-endian uint32)
        // We need to strip these headers to get clean log text.
        const data = this.demuxDockerStream(chunk);
        buffer += data;

        // Split into complete lines and emit each one
        const lines = buffer.split('\n');
        // Keep the last (possibly incomplete) line in the buffer
        buffer = lines.pop() ?? '';

        for (const line of lines) {
          const trimmed = line.trimEnd();
          if (trimmed.length > 0) {
            client.emit('log', `${LOG_PREFIX}${trimmed}`);
          }
        }
      });

      rawStream.on('error', (err) => {
        this.logger.error(
          `Stream error for socket ${socketId}: ${err.message}`,
        );
        client.emit('log_error', {
          message: `Log stream error: ${err.message}`,
        });
        this.stopStreaming(socketId);
      });

      rawStream.on('end', () => {
        this.logger.log(`Stream ended for socket ${socketId}`);
        // Flush remaining buffer
        if (buffer.trim().length > 0) {
          client.emit('log', `${LOG_PREFIX}${buffer.trim()}`);
        }
        this.activeStreams.delete(socketId);
      });

      this.logger.log(
        `Started streaming logs for container ${containerId} → socket ${socketId}`,
      );
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(
        `Failed to start streaming for socket ${socketId}: ${message}`,
      );
      client.emit('log_error', {
        message: `Failed to attach to container logs: ${message}`,
      });
    }
  }

  /**
   * Stops and destroys the log stream for a given socket.
   * Safe to call even if no stream exists for the socket.
   */
  stopStreaming(socketId: string): void {
    const stream = this.activeStreams.get(socketId);
    if (stream) {
      stream.destroy();
      this.activeStreams.delete(socketId);
      this.logger.log(`Destroyed stream for socket ${socketId}`);
    }
  }

  /**
   * Graceful shutdown: destroy all active streams.
   */
  onModuleDestroy(): void {
    this.logger.log(
      `Cleaning up ${this.activeStreams.size} active stream(s)...`,
    );
    for (const [socketId, stream] of this.activeStreams) {
      stream.destroy();
      this.logger.log(`Destroyed stream for socket ${socketId}`);
    }
    this.activeStreams.clear();
  }

  /**
   * Demultiplexes a Docker log stream chunk.
   *
   * Docker's multiplexed stream format prepends an 8-byte header to each frame:
   *   - Byte 0: stream type (0=stdin, 1=stdout, 2=stderr)
   *   - Bytes 1-3: reserved (0)
   *   - Bytes 4-7: payload size as big-endian uint32
   *
   * This method strips the headers and returns the combined payload text.
   */
  private demuxDockerStream(chunk: Buffer): string {
    const results: string[] = [];
    let offset = 0;

    while (offset < chunk.length) {
      // Need at least 8 bytes for the header
      if (offset + 8 > chunk.length) {
        // Incomplete header — treat remaining bytes as raw text
        results.push(chunk.subarray(offset).toString('utf-8'));
        break;
      }

      const headerByte = chunk[offset];

      // Check if this looks like a valid Docker stream header
      // Stream type should be 0 (stdin), 1 (stdout), or 2 (stderr)
      if (headerByte <= 2 && chunk[offset + 1] === 0 && chunk[offset + 2] === 0 && chunk[offset + 3] === 0) {
        const payloadSize = chunk.readUInt32BE(offset + 4);

        if (offset + 8 + payloadSize > chunk.length) {
          // Payload extends beyond chunk — take what we can
          results.push(chunk.subarray(offset + 8).toString('utf-8'));
          break;
        }

        const payload = chunk.subarray(offset + 8, offset + 8 + payloadSize);
        results.push(payload.toString('utf-8'));
        offset += 8 + payloadSize;
      } else {
        // Not a multiplexed stream — treat the whole chunk as raw text
        results.push(chunk.subarray(offset).toString('utf-8'));
        break;
      }
    }

    return results.join('');
  }
}
