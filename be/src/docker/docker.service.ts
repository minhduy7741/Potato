import { Injectable, Logger } from '@nestjs/common';
import Dockerode from 'dockerode';
import { Readable } from 'stream';
import * as tar from 'tar-fs';
import * as path from 'path';

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

  /**
   * Builds a Docker image from a local directory containing a Dockerfile.
   * 
   * @param contextDir - Path to the directory containing the source code and Dockerfile
   * @param imageName - Tag for the new image (e.g. "potato-app-123")
   * @param onProgress - Optional callback for build logs
   */
  async buildImage(contextDir: string, imageName: string, onProgress?: (msg: string) => void): Promise<void> {
    this.logger.log(`Building image ${imageName} from ${contextDir}...`);

    return new Promise((resolve, reject) => {
      // Pack the directory into a tar stream
      const tarStream = tar.pack(contextDir);

      this.docker.buildImage(tarStream, { t: imageName }, (err: Error | null, stream: NodeJS.ReadableStream | undefined) => {
        if (err || !stream) {
          this.logger.error(`Failed to start build for ${imageName}: ${err?.message || 'No stream'}`);
          return reject(err || new Error('No stream returned from buildImage'));
        }

        this.docker.modem.followProgress(
          stream,
          (followErr: Error | null, res: any[]) => {
            if (followErr) {
              this.logger.error(`Build progress error for ${imageName}: ${followErr.message}`);
              return reject(followErr);
            }
            this.logger.log(`Successfully built image: ${imageName}`);
            resolve();
          },
          (progress: any) => {
            if (progress.stream && onProgress) {
              const msg = progress.stream.trim();
              if (msg) onProgress(msg);
            }
          }
        );
      });
    });
  }

  /**
   * Inspects a Docker image.
   */
  async inspectImage(imageName: string): Promise<Dockerode.ImageInspectInfo> {
    const image = this.docker.getImage(imageName);
    return image.inspect();
  }

  /**
   * Removes a Docker image from the host system.
   */
  async removeImage(imageName: string): Promise<void> {
    this.logger.log(`Removing image: ${imageName}...`);
    try {
      const image = this.docker.getImage(imageName);
      await image.remove({ force: true });
      this.logger.log(`Successfully removed image: ${imageName}`);
    } catch (err: any) {
      this.logger.warn(`Failed to remove image ${imageName}: ${err.message}`);
    }
  }

  /**
   * Tags an existing image with a new name and tag.
   */
  async tagImage(srcImage: string, repo: string, tag: string): Promise<void> {
    this.logger.log(`Tagging image ${srcImage} as ${repo}:${tag}...`);
    try {
      const image = this.docker.getImage(srcImage);
      await image.tag({ repo, tag });
    } catch (err: any) {
      this.logger.error(`Failed to tag image ${srcImage}: ${err.message}`);
      throw err;
    }
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
   * Restarts a container.
   *
   * @param containerId - The Docker container ID
   */
  async restartContainer(containerId: string): Promise<void> {
    const container = this.docker.getContainer(containerId);
    await container.restart();
    this.logger.log(`Container restarted: ${containerId.substring(0, 12)}`);
  }

  /**
   * Force-removes a container (even if running).
   *
   * @param containerId - The Docker container ID
   */
  async removeContainer(containerId: string): Promise<void> {
    const container = this.getContainer(containerId);
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
  ): Promise<{ status: string; running: boolean; exitCode: number }> {
    const container = this.docker.getContainer(containerId);
    const info = await container.inspect();
    return {
      status: info.State.Status,
      running: info.State.Running,
      exitCode: info.State.ExitCode,
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
      tail: tail,
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

  /**
   * Returns a Set of all host ports currently bound by Docker containers.
   * Inspects both running and stopped containers to avoid allocation conflicts.
   */
  async getUsedHostPorts(): Promise<Set<number>> {
    const containers = await this.docker.listContainers({ all: true });
    const usedPorts = new Set<number>();

    for (const container of containers) {
      for (const portBinding of container.Ports || []) {
        if (portBinding.PublicPort) {
          usedPorts.add(portBinding.PublicPort);
        }
      }
    }

    this.logger.log(`Found ${usedPorts.size} host ports already in use by Docker`);
    return usedPorts;
  }

  /**
   * Lists containers, optionally filtering by running state or labels.
   *
   * @param options - Dockerode list options (all, filters, etc.)
   */
  async listContainers(options?: Dockerode.ContainerListOptions): Promise<Dockerode.ContainerInfo[]> {
    return this.docker.listContainers(options);
  }

  /**
   * Dynamically updates a running container's resource limits (CPU/RAM).
   */
  async updateContainerResources(containerId: string, resources: { cpuCores: number; ramMB: number }) {
    const container = this.getContainer(containerId);
    return container.update({
      NanoCPUs: Math.floor(resources.cpuCores * 1000000000),
      Memory: resources.ramMB * 1024 * 1024,
      MemorySwap: resources.ramMB * 1024 * 1024,
    });
  }

  /**
   * Lists all images on the host system.
   */
  async listImages(): Promise<Dockerode.ImageInfo[]> {
    return this.docker.listImages();
  }

  /**
   * Prunes dangling images on the host system.
   */
  async pruneImages(): Promise<any> {
    return this.docker.pruneImages();
  }
}
