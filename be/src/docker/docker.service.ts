import { Injectable, Logger } from '@nestjs/common';
import Dockerode from 'dockerode';
import { Readable } from 'stream';

/**
 * DockerService — Infrastructure layer for all Docker Engine interactions.
 *
 * Connects to the Docker socket and provides methods for:
 * - Image management (pull)
 * - Container lifecycle (create, start, stop, remove)
 * - Container monitoring (stats, state, logs)
 */
@Injectable()
export class DockerService {
  private readonly logger = new Logger(DockerService.name);
  private readonly docker: Dockerode;

  constructor() {
    // Connects to the local Docker socket automatically
    // Linux/Mac: /var/run/docker.sock
    // Windows: //./pipe/docker_engine
    this.docker = new Dockerode();
    this.logger.log('🥔 Docker Engine connected via socket');
  }

  // ─── Image Management ────────────────────────────────────────────────

  /**
   * Pulls a Docker image from the registry.
   * Waits for the pull to complete before resolving.
   *
   * @param imageName - Full image name (e.g. "node:20-alpine")
   */
  async pullImage(imageName: string): Promise<void> {
    this.logger.log(`Pulling image: ${imageName}...`);

    return new Promise((resolve, reject) => {
      this.docker.pull(imageName, (err: Error | null, stream: NodeJS.ReadableStream) => {
        if (err) {
          this.logger.error(`Failed to pull image ${imageName}: ${err.message}`);
          return reject(err);
        }

        // Follow the pull progress to completion
        this.docker.modem.followProgress(
          stream,
          (followErr: Error | null) => {
            if (followErr) {
              this.logger.error(`Pull progress error for ${imageName}: ${followErr.message}`);
              return reject(followErr);
            }
            this.logger.log(`Successfully pulled image: ${imageName}`);
            resolve();
          },
        );
      });
    });
  }

  // ─── Container Lifecycle ─────────────────────────────────────────────

  /**
   * Creates a new Docker container (does NOT start it).
   *
   * @param options - Dockerode container creation options
   * @returns The created Container object
   */
  async createContainer(
    options: Dockerode.ContainerCreateOptions,
  ): Promise<Dockerode.Container> {
    this.logger.log(`Creating container: ${options.name || 'unnamed'}`);
    const container = await this.docker.createContainer(options);
    this.logger.log(`Container created: ${container.id.substring(0, 12)}`);
    return container;
  }

  /**
   * Starts a stopped container.
   *
   * @param containerId - The Docker container ID
   */
  async startContainer(containerId: string): Promise<void> {
    const container = this.docker.getContainer(containerId);
    await container.start();
    this.logger.log(`Container started: ${containerId.substring(0, 12)}`);
  }

  /**
   * Stops a running container with a 10-second timeout.
   *
   * @param containerId - The Docker container ID
   */
  async stopContainer(containerId: string): Promise<void> {
    const container = this.docker.getContainer(containerId);
    await container.stop({ t: 10 });
    this.logger.log(`Container stopped: ${containerId.substring(0, 12)}`);
  }

  /**
   * Force-removes a container (even if running).
   *
   * @param containerId - The Docker container ID
   */
  async removeContainer(containerId: string): Promise<void> {
    const container = this.docker.getContainer(containerId);
    await container.remove({ force: true });
    this.logger.log(`Container removed: ${containerId.substring(0, 12)}`);
  }

  // ─── Container Monitoring ────────────────────────────────────────────

  /**
   * Returns the Dockerode Container object for a given container ID.
   */
  getContainer(containerId: string): Dockerode.Container {
    return this.docker.getContainer(containerId);
  }

  /**
   * Inspects a container and returns its current state.
   *
   * @param containerId - The Docker container ID
   * @returns Container state info (status, running, etc.)
   */
  async getContainerState(
    containerId: string,
  ): Promise<{ status: string; running: boolean }> {
    const container = this.docker.getContainer(containerId);
    const info = await container.inspect();
    return {
      status: info.State.Status,
      running: info.State.Running,
    };
  }

  /**
   * Fetches a one-shot stats snapshot for a container.
   * Calculates CPU percentage and memory usage in MB.
   *
   * @param containerId - The Docker container ID
   * @returns CPU percentage, memory used (MB), memory limit (MB)
   */
  async getContainerStats(containerId: string): Promise<{
    cpuPercent: number;
    memoryUsageMB: number;
    memoryLimitMB: number;
    memoryPercent: number;
  }> {
    const container = this.docker.getContainer(containerId);
    const stats = (await container.stats({ stream: false })) as Dockerode.ContainerStats;

    // ── CPU Calculation ──
    // Docker CPU stats use cumulative nanoseconds
    const cpuDelta =
      stats.cpu_stats.cpu_usage.total_usage -
      stats.precpu_stats.cpu_usage.total_usage;
    const systemDelta =
      stats.cpu_stats.system_cpu_usage -
      stats.precpu_stats.system_cpu_usage;
    const numCpus = stats.cpu_stats.online_cpus || 1;

    let cpuPercent = 0;
    if (systemDelta > 0 && cpuDelta > 0) {
      cpuPercent = (cpuDelta / systemDelta) * numCpus * 100;
    }

    // ── Memory Calculation ──
    const memoryUsageMB =
      (stats.memory_stats.usage || 0) / (1024 * 1024);
    const memoryLimitMB =
      (stats.memory_stats.limit || 0) / (1024 * 1024);
    const memoryPercent =
      memoryLimitMB > 0 ? (memoryUsageMB / memoryLimitMB) * 100 : 0;

    return {
      cpuPercent: Math.round(cpuPercent * 100) / 100,
      memoryUsageMB: Math.round(memoryUsageMB * 100) / 100,
      memoryLimitMB: Math.round(memoryLimitMB * 100) / 100,
      memoryPercent: Math.round(memoryPercent * 100) / 100,
    };
  }

  // ─── Log Streaming ───────────────────────────────────────────────────

  /**
   * Attaches to a Docker container's log stream with follow mode.
   * Returns a Node.js Readable stream that emits log data in real-time.
   *
   * @param containerId - The Docker container ID or name
   * @param tail - Number of existing log lines to include (default: 50)
   * @returns A Readable stream of container logs
   */
  async getContainerLogStream(
    containerId: string,
    tail = 50,
  ): Promise<Readable> {
    const container = this.getContainer(containerId);

    const logStream = (await container.logs({
      follow: true,
      stdout: true,
      stderr: true,
      tail,
      timestamps: true,
    })) as unknown as Readable;

    this.logger.log(`Attached to log stream for container ${containerId.substring(0, 12)}`);
    return logStream;
  }

  /**
   * Fetches the entire log history of a container as a string.
   * Useful for downloading log files.
   *
   * @param containerId - The Docker container ID
   * @returns String containing the container logs
   */
  async getContainerLogs(containerId: string): Promise<string> {
    const container = this.getContainer(containerId);
    const logs = await container.logs({
      stdout: true,
      stderr: true,
      tail: 1000,
      timestamps: true,
    });
    return logs.toString();
  }
}
