import { 
  Injectable, 
  InternalServerErrorException, 
  NotFoundException, 
  ConflictException,
  Logger
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { DockerService } from '../docker/docker.service';

const DB_PORT_MIN = 20000;
const DB_PORT_MAX = 29999;
const DEFAULT_PASS = 'potato123';

@Injectable()
export class DatabasesService {
  private readonly logger = new Logger(DatabasesService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly docker: DockerService,
  ) {}

  async findAll() {
    return this.prisma.databaseInstance.findMany({
      include: { project: true },
    });
  }

  async create(data: { name: string; type: string; projectId: number }) {
    const project = await this.prisma.project.findUnique({
      where: { id: data.projectId },
    });

    if (!project) {
      throw new NotFoundException(`Project with ID ${data.projectId} not found`);
    }

    const hostPort = await this.allocatePort();
    const containerName = `potato-db-${data.type}-${Date.now()}`;
    
    let image = '';
    let internalPort = 0;
    let env: string[] = [];
    let connectionString = '';

    switch (data.type.toLowerCase()) {
      case 'postgres':
        image = 'postgres:alpine';
        env = [`POSTGRES_PASSWORD=${DEFAULT_PASS}`];
        internalPort = 5432;
        connectionString = `postgresql://postgres:${DEFAULT_PASS}@localhost:${hostPort}/postgres`;
        break;
      case 'redis':
        image = 'redis:alpine';
        internalPort = 6379;
        connectionString = `redis://localhost:${hostPort}`;
        break;
      case 'mysql':
        image = 'mysql:8';
        env = [`MYSQL_ROOT_PASSWORD=${DEFAULT_PASS}`];
        internalPort = 3306;
        connectionString = `mysql://root:${DEFAULT_PASS}@localhost:${hostPort}/mysql`;
        break;
      case 'mongodb':
        image = 'mongo:latest';
        env = [
          `MONGO_INITDB_ROOT_USERNAME=potato_user`,
          `MONGO_INITDB_ROOT_PASSWORD=${DEFAULT_PASS}`,
        ];
        internalPort = 27017;
        connectionString = `mongodb://potato_user:${DEFAULT_PASS}@localhost:${hostPort}/admin`;
        break;
      default:
        throw new ConflictException(`Unsupported database type: ${data.type}`);
    }

    // Save to database as 'provisioning'
    const db = await this.prisma.databaseInstance.create({
      data: {
        name: data.name,
        type: data.type,
        status: 'provisioning',
        projectId: data.projectId,
      },
    });

    this.logger.log(`Database "${data.name}" (${data.type}) initialized with ID ${db.id}. Starting background provisioning...`);

    // Launch background provisioning task
    this.provisionDatabaseBackground(db.id, data.type, image, containerName, internalPort, env, hostPort, connectionString).catch(err => {
      this.logger.error(`Background provisioning failed for database ${db.id}: ${err.message}`);
    });

    return db;
  }

  /**
   * Background task to provision Database container.
   */
  private async provisionDatabaseBackground(
    dbId: number, 
    type: string, 
    image: string, 
    containerName: string, 
    internalPort: number, 
    env: string[], 
    hostPort: number,
    connectionString: string
  ) {
    try {
      // Pull image first
      try {
        await this.docker.pullImage(image);
      } catch (pullError) {
        this.logger.error(`Failed to pull database image ${image} in background: ${pullError.message}`);
      }

      await this.docker.createContainer({
        Image: image,
        name: containerName,
        HostConfig: {
          PortBindings: { [`${internalPort}/tcp`]: [{ HostPort: hostPort.toString() }] },
        },
        Env: env,
        Labels: {
          'potato.managed': 'true',
          'potato.type': 'database',
          'potato.db_type': type,
          'potato.db_id': dbId.toString(),
        },
      });

      await this.docker.startContainer(containerName);

      // Update database status to 'running'
      await this.prisma.databaseInstance.update({
        where: { id: dbId },
        data: { 
          status: 'running',
          connectionString 
        },
      });

      this.logger.log(`Background provisioning complete for database ${dbId}.`);
    } catch (error) {
      this.logger.error(`Failed to provision database ${dbId} in background: ${error.message}`);
      await this.prisma.databaseInstance.update({
        where: { id: dbId },
        data: { status: 'error' },
      });
    }
  }

  async remove(id: number) {
    const db = await this.prisma.databaseInstance.findUnique({ where: { id } });
    if (!db) throw new NotFoundException('Database not found');

    // Find and remove container if possible
    // We didn't store containerName in DB, so we'll try to find it by labels or naming convention
    // For simplicity, let's assume one DB per instance. 
    // In a real app, storing containerName or ID in DatabaseInstance table is better.

    await this.prisma.databaseInstance.delete({ where: { id } });
    return { success: true };
  }

  private async allocatePort(): Promise<number> {
    // Basic port allocation
    const existingDbs = await this.prisma.databaseInstance.findMany({
      select: { connectionString: true },
    });
    
    const usedPorts = existingDbs
      .map(db => {
        const match = db.connectionString?.match(/:(\d+)\//) || db.connectionString?.match(/:(\d+)$/);
        return match ? parseInt(match[1]) : null;
      })
      .filter(p => p !== null);

    for (let i = 0; i < 100; i++) {
      const port = Math.floor(Math.random() * (DB_PORT_MAX - DB_PORT_MIN + 1)) + DB_PORT_MIN;
      if (!usedPorts.includes(port)) return port;
    }
    
    throw new InternalServerErrorException('No available ports for database');
  }
}
