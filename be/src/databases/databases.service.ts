import {
  Injectable,
  InternalServerErrorException,
  NotFoundException,
  ConflictException,
  Logger
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { DockerService } from '../docker/docker.service';
import { exec } from 'child_process';
import { promisify } from 'util';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import * as zlib from 'zlib';
import { Cron, CronExpression } from '@nestjs/schedule';
import { encrypt } from '../common/encryption.util';

const execAsync = promisify(exec);

const DB_PORT_MIN = 20000;
const DB_PORT_MAX = 29999;
const DEFAULT_PASS = 'potato123';

@Injectable()
export class DatabasesService {
  private readonly logger = new Logger(DatabasesService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly docker: DockerService,
  ) { }

  async findAll() {
    const dbs = await this.prisma.databaseInstance.findMany({
      include: { project: true, activityLogs: true },
    });

    // Tự động đồng bộ trạng thái từ Docker (Lazy Sync)
    for (const db of dbs) {
      try {
        const containers = await this.docker.listContainers({
          all: true,
          filters: JSON.stringify({ label: [`potato.db_id=${db.id}`] }),
        });

        // Nếu container tồn tại và đang chạy, status là 'running'. Ngược lại là 'stopped'.
        const actualStatus = containers.length > 0
          ? (containers[0].State === 'running' ? 'running' : 'stopped')
          : 'stopped';

        if (db.status !== actualStatus) {
          await this.prisma.databaseInstance.update({
            where: { id: db.id },
            data: { status: actualStatus },
          });
          db.status = actualStatus;
        }
      } catch (error: any) {
        this.logger.warn(`Failed to sync status for database ${db.id}: ${error.message}`);
      }
    }

    return dbs;
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

    const dbName = data.name.replace(/[^a-zA-Z0-9_]/g, '_') || 'potato_db';

    switch (data.type.toLowerCase()) {
      case 'postgres':
        image = 'postgres:alpine';
        env = [`POSTGRES_PASSWORD=${DEFAULT_PASS}`, `POSTGRES_DB=${dbName}`];
        internalPort = 5432;
        connectionString = `postgresql://postgres:${DEFAULT_PASS}@localhost:${hostPort}/${dbName}`;
        break;
      case 'redis':
        image = 'redis:alpine';
        internalPort = 6379;
        connectionString = `redis://localhost:${hostPort}`;
        break;
      case 'mysql':
        image = 'mysql:8';
        env = [`MYSQL_ROOT_PASSWORD=${DEFAULT_PASS}`, `MYSQL_DATABASE=${dbName}`];
        internalPort = 3306;
        connectionString = `mysql://root:${DEFAULT_PASS}@localhost:${hostPort}/${dbName}`;
        break;
      case 'mongodb':
        image = 'mongo:latest';
        env = [
          `MONGO_INITDB_ROOT_USERNAME=potato_user`,
          `MONGO_INITDB_ROOT_PASSWORD=${DEFAULT_PASS}`,
        ];
        internalPort = 27017;
        connectionString = `mongodb://potato_user:${DEFAULT_PASS}@localhost:${hostPort}/${dbName}?authSource=admin`;
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
          RestartPolicy: { Name: 'always' },
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

      // Wait for database to initialize (especially MySQL/Postgres)
      if (type === 'mysql' || type === 'postgres') {
        this.logger.log(`Waiting 20s for database ${dbId} to fully initialize...`);
        await new Promise(resolve => setTimeout(resolve, 20000));
      }

      // Update database status to 'running'
      await this.prisma.databaseInstance.update({
        where: { id: dbId },
        data: {
          status: 'running',
          connectionString
        },
      });

      this.logger.log(`Background provisioning complete for database ${dbId}.`);

      // Auto-inject env variables (only if this is the first database of the project)
      const db = await this.prisma.databaseInstance.findUnique({ where: { id: dbId } });
      if (db && db.projectId) {
        const otherDbsCount = await this.prisma.databaseInstance.count({
          where: { projectId: db.projectId, id: { not: dbId } }
        });

        if (otherDbsCount > 0) {
          this.logger.log(`Project ${db.projectId} already has other database(s). Skipping auto-injection.`);
          return;
        }

        const dbName = db.name.replace(/[^a-zA-Z0-9_]/g, '_') || 'potato_db';
        let dbConnection = '';
        let dbDatabase = '';
        let dbUser = '';

        if (type === 'mysql') {
          dbConnection = 'mysql';
          dbDatabase = dbName;
          dbUser = 'root';
        } else if (type === 'postgres') {
          dbConnection = 'pgsql';
          dbDatabase = dbName;
          dbUser = 'postgres';
        }

        if (dbConnection) {
          const envs = [
            { key: 'DB_CONNECTION', value: dbConnection },
            { key: 'DB_HOST', value: 'host.docker.internal' },
            { key: 'DB_PORT', value: hostPort.toString() },
            { key: 'DB_DATABASE', value: dbDatabase },
            { key: 'DB_USERNAME', value: dbUser },
            { key: 'DB_PASSWORD', value: DEFAULT_PASS },
          ];

          for (const env of envs) {
            const existing = await this.prisma.envVariable.findFirst({
              where: { projectId: db.projectId, key: env.key }
            });
            const isSecret = env.key === 'DB_PASSWORD';
            const encryptedValue = isSecret ? encrypt(env.value) : env.value;
            if (existing) {
              await this.prisma.envVariable.update({
                where: { id: existing.id },
                data: { value: encryptedValue }
              });
            } else {
              await this.prisma.envVariable.create({
                data: { projectId: db.projectId, key: env.key, value: encryptedValue, isSecret }
              });
            }
          }
          this.logger.log(`Auto-injected DB environment variables for project ${db.projectId}`);
        }
      }
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

    // Find and stop+remove the Docker container by label
    try {
      const containers = await this.docker.listContainers({
        all: true,
        filters: JSON.stringify({ label: [`potato.db_id=${id}`] }),
      });

      if (containers.length > 0) {
        await this.docker.removeContainer(containers[0].Id);
        this.logger.log(`Removed Docker container for database ${id}`);
      } else {
        this.logger.warn(`No Docker container found for database ${id}`);
      }
    } catch (error) {
      this.logger.warn(`Failed to remove container for database ${id}: ${error.message}`);
      // Continue with DB deletion even if container cleanup fails
    }

    await this.prisma.databaseInstance.delete({ where: { id } });
    this.logger.log(`Database record ${id} deleted`);
    return { success: true };
  }

  private async allocatePort(): Promise<number> {
    // 1. Lấy tất cả cổng database đã được lưu trong DB
    const existingDbs = await this.prisma.databaseInstance.findMany({
      select: { connectionString: true },
    });

    const dbPorts = existingDbs
      .map(db => {
        const match = db.connectionString?.match(/:(\d+)\//) || db.connectionString?.match(/:(\d+)$/);
        return match ? parseInt(match[1]) : null;
      })
      .filter(p => p !== null) as number[];

    // 2. Lấy tất cả cổng Host đang bị chiếm dụng thực tế bởi Docker containers
    let dockerPorts: Set<number>;
    try {
      dockerPorts = await this.docker.getUsedHostPorts();
    } catch {
      this.logger.warn('Could not inspect Docker ports, falling back to database check');
      dockerPorts = new Set();
    }

    for (let i = 0; i < 100; i++) {
      const port = Math.floor(Math.random() * (DB_PORT_MAX - DB_PORT_MIN + 1)) + DB_PORT_MIN;
      
      // Check xem cổng có bị trùng trong DB, Docker hay OS vật lý không
      if (!dbPorts.includes(port) && !dockerPorts.has(port)) {
        const physicalFree = await this.isPortPhysicalFree(port);
        if (physicalFree) {
          this.logger.log(`Allocated port ${port} for database (${dockerPorts.size} docker ports in use)`);
          return port;
        }
      }
    }

    throw new InternalServerErrorException('No available ports for database');
  }

  private isPortPhysicalFree(port: number): Promise<boolean> {
    return new Promise((resolve) => {
      const server = require('net').createServer();
      server.once('error', () => {
        resolve(false);
      });
      server.once('listening', () => {
        server.close();
        resolve(true);
      });
      server.listen(port);
    });
  }

  async getLogs(id: number) {
    return this.prisma.databaseActivityLog.findMany({
      where: { databaseId: id },
      orderBy: { createdAt: 'desc' }
    });
  }

  async changePassword(id: number, newPass: string) {
    const db = await this.prisma.databaseInstance.findUnique({ where: { id } });
    if (!db || db.status !== 'running') throw new NotFoundException('Database chưa sẵn sàng hoặc không tồn tại');

    const containers = await this.docker.listContainers({
      all: true,
      filters: JSON.stringify({ label: [`potato.db_id=${id}`] }),
    });
    if (containers.length === 0) throw new NotFoundException('Không tìm thấy Container của Database này. Có thể nó đã bị lỗi hoặc xoá.');
    const containerId = containers[0].Id;

    if (!db.connectionString) throw new ConflictException('Không tìm thấy chuỗi kết nối');
    const url = new URL(db.connectionString);
    const oldPass = url.password;
    const username = url.username;

    let cmd: string[];
    if (db.type === 'mysql') {
      cmd = ['mysql', '-u', username, `-p${oldPass}`, '-e', `ALTER USER '${username}'@'%' IDENTIFIED BY '${newPass}'; ALTER USER '${username}'@'localhost' IDENTIFIED BY '${newPass}';`];
    } else if (db.type === 'postgres') {
      cmd = ['psql', '-U', username, '-c', `ALTER USER ${username} PASSWORD '${newPass}';`];
    } else {
      throw new ConflictException('Đổi mật khẩu hiện chỉ hỗ trợ MySQL và PostgreSQL');
    }

    try {
      let success = false;
      let lastError = '';

      for (let attempt = 1; attempt <= 15; attempt++) {
      try {
        const exec = await this.docker.getContainer(containerId).exec({
          Cmd: cmd,
          AttachStdout: true,
          AttachStderr: true,
        });
        const stream = await exec.start({});

        // Wait for the exec to finish
        await new Promise((resolve, reject) => {
          stream.on('end', resolve);
          stream.on('error', reject);
          setTimeout(resolve, 5000);
        });

        const inspectResult = await exec.inspect();
        if (inspectResult.ExitCode === 0) {
          success = true;
          break;
        } else {
          lastError = `Exit code ${inspectResult.ExitCode}`;
          // Wait 1.5 seconds before retrying
          await new Promise(r => setTimeout(r, 1500));
        }
      } catch (err: any) {
        lastError = err.message;
        await new Promise(r => setTimeout(r, 1500));
      }
    }

    if (!success) {
      throw new ConflictException(`Không thể thay đổi mật khẩu trong container database: ${lastError}`);
    }

      // Update connection string
      url.password = newPass;
      const newConnectionString = url.toString();

      await this.prisma.databaseInstance.update({
        where: { id },
        data: { connectionString: newConnectionString }
      });

      // Update Project Env Variable (only if it is currently selected/active, or is the only DB)
      let dbPort = '';
      if (db.connectionString) {
        try {
          const parsedUrl = new URL(db.connectionString);
          dbPort = parsedUrl.port;
        } catch (e) {}
      }

      const portEnv = await this.prisma.envVariable.findFirst({
        where: { projectId: db.projectId, key: 'DB_PORT' }
      });

      const isCurrentDb = portEnv && dbPort && portEnv.value === dbPort;
      const otherDbsCount = await this.prisma.databaseInstance.count({
        where: { projectId: db.projectId, id: { not: id } }
      });

      if (isCurrentDb || otherDbsCount === 0) {
        const envVar = await this.prisma.envVariable.findFirst({
          where: { projectId: db.projectId, key: 'DB_PASSWORD' }
        });
        if (envVar) {
          await this.prisma.envVariable.update({
            where: { id: envVar.id },
            data: { value: encrypt(newPass) }
          });
        }
      }

      await this.prisma.databaseActivityLog.create({
        data: { databaseId: id, action: 'CHANGE_PASSWORD', status: 'SUCCESS' }
      });

      return { success: true, connectionString: newConnectionString };
    } catch (err: any) {
      await this.prisma.databaseActivityLog.create({
        data: { databaseId: id, action: 'CHANGE_PASSWORD', status: 'FAILED', message: err.message }
      });
      throw err;
    }
  }

  async importDatabase(id: number, filePath: string, originalName: string = 'file.sql') {
    const db = await this.prisma.databaseInstance.findUnique({ where: { id } });
    if (!db || db.status !== 'running') throw new NotFoundException('Database chưa sẵn sàng hoặc không tồn tại');

    const containers = await this.docker.listContainers({
      all: true,
      filters: JSON.stringify({ label: [`potato.db_id=${id}`] }),
    });
    if (containers.length === 0) throw new NotFoundException('Không tìm thấy Container của Database này.');
    const containerId = containers[0].Id;

    if (!db.connectionString) throw new ConflictException('Không tìm thấy chuỗi kết nối');
    const url = new URL(db.connectionString);
    const password = url.password;
    const username = url.username;

    try {
      await execAsync(`docker cp "${filePath}" ${containerId}:/tmp/import_file`);

      const dbName = url.pathname.substring(1) || (db.type === 'mysql' ? 'mysql' : 'postgres');

      if (db.type === 'mysql') {
        await execAsync(`docker exec ${containerId} sh -c "mysql -u ${username} -p${password} ${dbName} < /tmp/import_file"`);
      } else if (db.type === 'postgres') {
        await execAsync(`docker exec ${containerId} sh -c "psql -U ${username} -d ${dbName} < /tmp/import_file"`);
      } else if (db.type === 'mongodb') {
        await execAsync(`docker exec ${containerId} sh -c "mongorestore --archive=/tmp/import_file --username ${username} --password ${password} --authenticationDatabase admin"`);
      } else {
        throw new ConflictException('Import chưa được hỗ trợ cho loại Database này');
      }

      await execAsync(`docker exec ${containerId} rm -f /tmp/import_file`).catch(() => { });
      fs.unlinkSync(filePath);

      await this.prisma.databaseActivityLog.create({
        data: { databaseId: id, action: 'IMPORT', filename: originalName, status: 'SUCCESS' }
      });

      return { success: true };
    } catch (err: any) {
      this.logger.error(`Import failed: ${err.message}`);
      await this.prisma.databaseActivityLog.create({
        data: { databaseId: id, action: 'IMPORT', filename: originalName, status: 'FAILED', message: err.message }
      });
      throw new InternalServerErrorException(`Quá trình import thất bại: ${err.message}`);
    }
  }

  async exportDatabase(id: number): Promise<string> {
    const db = await this.prisma.databaseInstance.findUnique({ where: { id } });
    if (!db || db.status !== 'running') throw new NotFoundException('Database chưa sẵn sàng hoặc không tồn tại');

    const containers = await this.docker.listContainers({
      all: true,
      filters: JSON.stringify({ label: [`potato.db_id=${id}`] }),
    });
    if (containers.length === 0) throw new NotFoundException('Không tìm thấy Container của Database này.');
    const containerId = containers[0].Id;

    if (!db.connectionString) throw new ConflictException('Không tìm thấy chuỗi kết nối');
    const url = new URL(db.connectionString);
    const password = url.password;
    const username = url.username;

    const outputPath = path.join(process.cwd(), 'uploads', `export_${id}_${Date.now()}`);

    // Ensure uploads directory exists
    if (!fs.existsSync(path.join(process.cwd(), 'uploads'))) {
      fs.mkdirSync(path.join(process.cwd(), 'uploads'), { recursive: true });
    }

    try {
      // 1. Generate dump inside container
      if (db.type === 'mysql') {
        await execAsync(`docker exec ${containerId} sh -c "mysqldump -u ${username} -p${password} --all-databases > /tmp/export_file"`);
      } else if (db.type === 'postgres') {
        await execAsync(`docker exec ${containerId} sh -c "pg_dumpall -U ${username} > /tmp/export_file"`);
      } else if (db.type === 'mongodb') {
        await execAsync(`docker exec ${containerId} sh -c "mongodump --archive=/tmp/export_file --username ${username} --password ${password} --authenticationDatabase admin"`);
      } else {
        throw new ConflictException('Export chưa được hỗ trợ cho loại Database này');
      }

      // 2. Copy file out of container
      await execAsync(`docker cp ${containerId}:/tmp/export_file "${outputPath}"`);

      // 3. Clean up inside container
      await execAsync(`docker exec ${containerId} rm -f /tmp/export_file`).catch(() => { });

      await this.prisma.databaseActivityLog.create({
        data: { databaseId: id, action: 'EXPORT', status: 'SUCCESS' }
      });

      return outputPath;
    } catch (err: any) {
      this.logger.error(`Export failed: ${err.message}`);
      await this.prisma.databaseActivityLog.create({
        data: { databaseId: id, action: 'EXPORT', status: 'FAILED', message: err.message }
      });
      throw new InternalServerErrorException(`Quá trình export thất bại: ${err.message}`);
    }
  }

  // ─── Automated Backups ───────────────────────────────────────────────

  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async handleScheduledBackups() {
    this.logger.log('Starting automated database backups cron...');
    const databases = await this.prisma.databaseInstance.findMany({
      where: { status: 'running' }
    });

    for (const db of databases) {
      try {
        this.logger.log(`Running auto-backup for database ${db.id} (${db.name})...`);
        await this.createBackup(db.id);
      } catch (err: any) {
        this.logger.error(`Auto-backup failed for database ${db.id}: ${err.message}`);
      }
    }
  }

  async createBackup(id: number): Promise<string> {
    const db = await this.prisma.databaseInstance.findUnique({ where: { id } });
    if (!db || db.status !== 'running') throw new NotFoundException('Database is not running');

    const backupDir = path.join(process.cwd(), 'uploads', 'backups', `db-${id}`);
    if (!fs.existsSync(backupDir)) {
      fs.mkdirSync(backupDir, { recursive: true });
    }

    const tempExportPath = await this.exportDatabase(id);

    const ext = db.type === 'mongodb' ? '.archive' : '.sql';
    const fileName = `backup_${Date.now()}${ext}.gz`;
    const backupPath = path.join(backupDir, fileName);

    // Compress raw backup with gzip streams
    const source = fs.createReadStream(tempExportPath);
    const destination = fs.createWriteStream(backupPath);
    const gzip = zlib.createGzip();

    await new Promise<void>((resolve, reject) => {
      source.pipe(gzip).pipe(destination)
        .on('finish', resolve)
        .on('error', reject);
    });

    // Clean up temporary uncompressed export file
    fs.unlinkSync(tempExportPath);

    await this.rotateBackups(backupDir, 5);

    return fileName;
  }

  private async rotateBackups(dir: string, maxFiles: number = 5) {
    try {
      const files = fs.readdirSync(dir)
        .filter(f => f.startsWith('backup_'))
        .map(f => ({
          name: f,
          path: path.join(dir, f),
          time: fs.statSync(path.join(dir, f)).mtime.getTime()
        }))
        .sort((a, b) => b.time - a.time);

      if (files.length > maxFiles) {
        const toDelete = files.slice(maxFiles);
        for (const f of toDelete) {
          fs.unlinkSync(f.path);
          this.logger.log(`Deleted old backup file: ${f.name}`);
        }
      }
    } catch (err: any) {
      this.logger.warn(`Failed to rotate backups: ${err.message}`);
    }
  }

  async listBackups(id: number) {
    const backupDir = path.join(process.cwd(), 'uploads', 'backups', `db-${id}`);
    if (!fs.existsSync(backupDir)) return [];

    return fs.readdirSync(backupDir)
      .filter(f => f.startsWith('backup_'))
      .map(f => {
        const stat = fs.statSync(path.join(backupDir, f));
        return {
          filename: f,
          size: stat.size,
          createdAt: stat.mtime
        };
      })
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  async getBackupFilePath(id: number, filename: string): Promise<string> {
    const backupDir = path.join(process.cwd(), 'uploads', 'backups', `db-${id}`);
    const filePath = path.join(backupDir, filename);
    if (!fs.existsSync(filePath)) {
      throw new NotFoundException('Backup file not found');
    }
    return filePath;
  }

  async restoreFromBackup(id: number, filename: string) {
    const backupFilePath = await this.getBackupFilePath(id, filename);
    const tempPath = path.join(os.tmpdir(), `restore_${id}_${Date.now()}`);

    if (filename.endsWith('.gz')) {
      // Decompress gzip file before import
      const source = fs.createReadStream(backupFilePath);
      const destination = fs.createWriteStream(tempPath);
      const gunzip = zlib.createGunzip();

      await new Promise<void>((resolve, reject) => {
        source.pipe(gunzip).pipe(destination)
          .on('finish', resolve)
          .on('error', reject);
      });
    } else {
      fs.copyFileSync(backupFilePath, tempPath);
    }

    return this.importDatabase(id, tempPath, filename);
  }

  async runQuery(id: number, query: string) {
    const db = await this.prisma.databaseInstance.findUnique({ where: { id } });
    if (!db) throw new NotFoundException('Không tìm thấy Database.');

    const containers = await this.docker.listContainers({
      filters: JSON.stringify({ label: [`potato.db_id=${id}`] }),
    });
    if (containers.length === 0) throw new NotFoundException('Không tìm thấy Container của Database này.');
    const containerId = containers[0].Id;

    if (!db.connectionString) throw new ConflictException('Không tìm thấy chuỗi kết nối');
    const url = new URL(db.connectionString);
    const password = url.password;
    const username = url.username;
    const dbName = url.pathname.substring(1) || (db.type === 'mysql' ? 'mysql' : 'postgres');

    try {
      let result = '';
      if (db.type === 'mysql') {
        const tmpQueryFile = `/tmp/query_${Date.now()}.sql`;
        const localTmpFile = path.join(os.tmpdir(), `query_${Date.now()}.sql`);
        fs.writeFileSync(localTmpFile, query);

        await execAsync(`docker cp "${localTmpFile}" ${containerId}:${tmpQueryFile}`);
        fs.unlinkSync(localTmpFile);

        const { stdout } = await execAsync(`docker exec ${containerId} sh -c "mysql -u ${username} -p${password} -B ${dbName} < ${tmpQueryFile}"`);
        await execAsync(`docker exec ${containerId} rm -f ${tmpQueryFile}`).catch(() => { });

        result = stdout;
      } else if (db.type === 'postgres') {
        const tmpQueryFile = `/tmp/query_${Date.now()}.sql`;
        const localTmpFile = path.join(os.tmpdir(), `query_${Date.now()}.sql`);
        fs.writeFileSync(localTmpFile, query);

        await execAsync(`docker cp "${localTmpFile}" ${containerId}:${tmpQueryFile}`);
        fs.unlinkSync(localTmpFile);

        const { stdout } = await execAsync(`docker exec ${containerId} sh -c "psql -U ${username} -A -F '\\t' -q -d ${dbName} -f ${tmpQueryFile}"`);
        await execAsync(`docker exec ${containerId} rm -f ${tmpQueryFile}`).catch(() => { });

        result = stdout;
      } else if (db.type === 'mongodb') {
        const tmpQueryFile = `/tmp/query_${Date.now()}.js`;
        const localTmpFile = path.join(os.tmpdir(), `query_${Date.now()}.js`);
        fs.writeFileSync(localTmpFile, query);

        await execAsync(`docker cp "${localTmpFile}" ${containerId}:${tmpQueryFile}`);
        fs.unlinkSync(localTmpFile);

        const { stdout } = await execAsync(`docker exec ${containerId} sh -c "mongosh --username ${username} --password ${password} --authenticationDatabase admin --quiet < ${tmpQueryFile}"`);
        await execAsync(`docker exec ${containerId} rm -f ${tmpQueryFile}`).catch(() => { });

        result = stdout;
      } else {
        throw new ConflictException('Loại database này chưa hỗ trợ thực thi truy vấn trực tiếp.');
      }

      const lines = result.trim().split('\n');
      if (lines.length === 0 || (lines.length === 1 && lines[0] === '')) {
        return { columns: [], rows: [], raw: 'Không có dữ liệu hoặc truy vấn thực thi thành công.' };
      }

      const columns = lines[0].split('\t');
      const rows = lines.slice(1).map(line => {
        const values = line.split('\t');
        const rowObj: any = {};
        columns.forEach((col, idx) => {
          rowObj[col] = values[idx] || null;
        });
        return rowObj;
      });

      return { columns, rows, raw: result };
    } catch (err: any) {
      this.logger.error(`Query execution failed: ${err.message}`);
      throw new InternalServerErrorException(`Lỗi thực thi truy vấn: ${err.message}`);
    }
  }
}
