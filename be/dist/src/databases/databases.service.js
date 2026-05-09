"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var DatabasesService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.DatabasesService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
const docker_service_1 = require("../docker/docker.service");
const child_process_1 = require("child_process");
const util_1 = require("util");
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const execAsync = (0, util_1.promisify)(child_process_1.exec);
const DB_PORT_MIN = 20000;
const DB_PORT_MAX = 29999;
const DEFAULT_PASS = 'potato123';
let DatabasesService = DatabasesService_1 = class DatabasesService {
    prisma;
    docker;
    logger = new common_1.Logger(DatabasesService_1.name);
    constructor(prisma, docker) {
        this.prisma = prisma;
        this.docker = docker;
    }
    async findAll() {
        return this.prisma.databaseInstance.findMany({
            include: { project: true, activityLogs: true },
        });
    }
    async create(data) {
        const project = await this.prisma.project.findUnique({
            where: { id: data.projectId },
        });
        if (!project) {
            throw new common_1.NotFoundException(`Project with ID ${data.projectId} not found`);
        }
        const hostPort = await this.allocatePort();
        const containerName = `potato-db-${data.type}-${Date.now()}`;
        let image = '';
        let internalPort = 0;
        let env = [];
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
                throw new common_1.ConflictException(`Unsupported database type: ${data.type}`);
        }
        const db = await this.prisma.databaseInstance.create({
            data: {
                name: data.name,
                type: data.type,
                status: 'provisioning',
                projectId: data.projectId,
            },
        });
        this.logger.log(`Database "${data.name}" (${data.type}) initialized with ID ${db.id}. Starting background provisioning...`);
        this.provisionDatabaseBackground(db.id, data.type, image, containerName, internalPort, env, hostPort, connectionString).catch(err => {
            this.logger.error(`Background provisioning failed for database ${db.id}: ${err.message}`);
        });
        return db;
    }
    async provisionDatabaseBackground(dbId, type, image, containerName, internalPort, env, hostPort, connectionString) {
        try {
            try {
                await this.docker.pullImage(image);
            }
            catch (pullError) {
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
            await this.prisma.databaseInstance.update({
                where: { id: dbId },
                data: {
                    status: 'running',
                    connectionString
                },
            });
            this.logger.log(`Background provisioning complete for database ${dbId}.`);
            const db = await this.prisma.databaseInstance.findUnique({ where: { id: dbId } });
            if (db && db.projectId) {
                let dbConnection = '';
                let dbDatabase = '';
                let dbUser = '';
                if (type === 'mysql') {
                    dbConnection = 'mysql';
                    dbDatabase = 'mysql';
                    dbUser = 'root';
                }
                else if (type === 'postgres') {
                    dbConnection = 'pgsql';
                    dbDatabase = 'postgres';
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
                        if (existing) {
                            await this.prisma.envVariable.update({
                                where: { id: existing.id },
                                data: { value: env.value }
                            });
                        }
                        else {
                            await this.prisma.envVariable.create({
                                data: { projectId: db.projectId, key: env.key, value: env.value, isSecret: env.key === 'DB_PASSWORD' }
                            });
                        }
                    }
                    this.logger.log(`Auto-injected DB environment variables for project ${db.projectId}`);
                }
            }
        }
        catch (error) {
            this.logger.error(`Failed to provision database ${dbId} in background: ${error.message}`);
            await this.prisma.databaseInstance.update({
                where: { id: dbId },
                data: { status: 'error' },
            });
        }
    }
    async remove(id) {
        const db = await this.prisma.databaseInstance.findUnique({ where: { id } });
        if (!db)
            throw new common_1.NotFoundException('Database not found');
        try {
            const containers = await this.docker.listContainers({
                all: true,
                filters: JSON.stringify({ label: [`potato.db_id=${id}`] }),
            });
            if (containers.length > 0) {
                await this.docker.removeContainer(containers[0].Id);
                this.logger.log(`Removed Docker container for database ${id}`);
            }
            else {
                this.logger.warn(`No Docker container found for database ${id}`);
            }
        }
        catch (error) {
            this.logger.warn(`Failed to remove container for database ${id}: ${error.message}`);
        }
        await this.prisma.databaseInstance.delete({ where: { id } });
        this.logger.log(`Database record ${id} deleted`);
        return { success: true };
    }
    async allocatePort() {
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
            if (!usedPorts.includes(port))
                return port;
        }
        throw new common_1.InternalServerErrorException('No available ports for database');
    }
    async getLogs(id) {
        return this.prisma.databaseActivityLog.findMany({
            where: { databaseId: id },
            orderBy: { createdAt: 'desc' }
        });
    }
    async changePassword(id, newPass) {
        const db = await this.prisma.databaseInstance.findUnique({ where: { id } });
        if (!db || db.status !== 'running')
            throw new common_1.NotFoundException('Database chưa sẵn sàng hoặc không tồn tại');
        const containers = await this.docker.listContainers({
            all: true,
            filters: JSON.stringify({ label: [`potato.db_id=${id}`] }),
        });
        if (containers.length === 0)
            throw new common_1.NotFoundException('Không tìm thấy Container của Database này. Có thể nó đã bị lỗi hoặc xoá.');
        const containerId = containers[0].Id;
        if (!db.connectionString)
            throw new common_1.ConflictException('Không tìm thấy chuỗi kết nối');
        const url = new URL(db.connectionString);
        const oldPass = url.password;
        const username = url.username;
        let cmd;
        if (db.type === 'mysql') {
            cmd = ['mysql', '-u', username, `-p${oldPass}`, '-e', `ALTER USER '${username}'@'%' IDENTIFIED BY '${newPass}';`];
        }
        else if (db.type === 'postgres') {
            cmd = ['psql', '-U', username, '-c', `ALTER USER ${username} PASSWORD '${newPass}';`];
        }
        else {
            throw new common_1.ConflictException('Đổi mật khẩu hiện chỉ hỗ trợ MySQL và PostgreSQL');
        }
        try {
            const exec = await this.docker.getContainer(containerId).exec({
                Cmd: cmd,
                AttachStdout: true,
                AttachStderr: true,
            });
            const stream = await exec.start({});
            await new Promise((resolve, reject) => {
                stream.on('end', resolve);
                stream.on('error', reject);
                setTimeout(resolve, 5000);
            });
            url.password = newPass;
            const newConnectionString = url.toString();
            await this.prisma.databaseInstance.update({
                where: { id },
                data: { connectionString: newConnectionString }
            });
            const envVar = await this.prisma.envVariable.findFirst({
                where: { projectId: db.projectId, key: 'DB_PASSWORD' }
            });
            if (envVar) {
                await this.prisma.envVariable.update({
                    where: { id: envVar.id },
                    data: { value: newPass }
                });
            }
            await this.prisma.databaseActivityLog.create({
                data: { databaseId: id, action: 'CHANGE_PASSWORD', status: 'SUCCESS' }
            });
            return { success: true, connectionString: newConnectionString };
        }
        catch (err) {
            await this.prisma.databaseActivityLog.create({
                data: { databaseId: id, action: 'CHANGE_PASSWORD', status: 'FAILED', message: err.message }
            });
            throw err;
        }
    }
    async importDatabase(id, filePath, originalName = 'file.sql') {
        const db = await this.prisma.databaseInstance.findUnique({ where: { id } });
        if (!db || db.status !== 'running')
            throw new common_1.NotFoundException('Database chưa sẵn sàng hoặc không tồn tại');
        const containers = await this.docker.listContainers({
            all: true,
            filters: JSON.stringify({ label: [`potato.db_id=${id}`] }),
        });
        if (containers.length === 0)
            throw new common_1.NotFoundException('Không tìm thấy Container của Database này.');
        const containerId = containers[0].Id;
        if (!db.connectionString)
            throw new common_1.ConflictException('Không tìm thấy chuỗi kết nối');
        const url = new URL(db.connectionString);
        const password = url.password;
        const username = url.username;
        try {
            await execAsync(`docker cp "${filePath}" ${containerId}:/tmp/import_file`);
            if (db.type === 'mysql') {
                await execAsync(`docker exec ${containerId} sh -c "mysql -u ${username} -p${password} mysql < /tmp/import_file"`);
            }
            else if (db.type === 'postgres') {
                await execAsync(`docker exec ${containerId} sh -c "psql -U ${username} -d postgres < /tmp/import_file"`);
            }
            else if (db.type === 'mongodb') {
                await execAsync(`docker exec ${containerId} sh -c "mongorestore --archive=/tmp/import_file --username ${username} --password ${password} --authenticationDatabase admin"`);
            }
            else {
                throw new common_1.ConflictException('Import chưa được hỗ trợ cho loại Database này');
            }
            await execAsync(`docker exec ${containerId} rm -f /tmp/import_file`).catch(() => { });
            fs.unlinkSync(filePath);
            await this.prisma.databaseActivityLog.create({
                data: { databaseId: id, action: 'IMPORT', filename: originalName, status: 'SUCCESS' }
            });
            return { success: true };
        }
        catch (err) {
            this.logger.error(`Import failed: ${err.message}`);
            await this.prisma.databaseActivityLog.create({
                data: { databaseId: id, action: 'IMPORT', filename: originalName, status: 'FAILED', message: err.message }
            });
            throw new common_1.InternalServerErrorException(`Quá trình import thất bại: ${err.message}`);
        }
    }
    async exportDatabase(id) {
        const db = await this.prisma.databaseInstance.findUnique({ where: { id } });
        if (!db || db.status !== 'running')
            throw new common_1.NotFoundException('Database chưa sẵn sàng hoặc không tồn tại');
        const containers = await this.docker.listContainers({
            all: true,
            filters: JSON.stringify({ label: [`potato.db_id=${id}`] }),
        });
        if (containers.length === 0)
            throw new common_1.NotFoundException('Không tìm thấy Container của Database này.');
        const containerId = containers[0].Id;
        if (!db.connectionString)
            throw new common_1.ConflictException('Không tìm thấy chuỗi kết nối');
        const url = new URL(db.connectionString);
        const password = url.password;
        const username = url.username;
        const outputPath = path.join(process.cwd(), 'uploads', `export_${id}_${Date.now()}`);
        if (!fs.existsSync(path.join(process.cwd(), 'uploads'))) {
            fs.mkdirSync(path.join(process.cwd(), 'uploads'), { recursive: true });
        }
        try {
            if (db.type === 'mysql') {
                await execAsync(`docker exec ${containerId} sh -c "mysqldump -u ${username} -p${password} --all-databases > /tmp/export_file"`);
            }
            else if (db.type === 'postgres') {
                await execAsync(`docker exec ${containerId} sh -c "pg_dumpall -U ${username} > /tmp/export_file"`);
            }
            else if (db.type === 'mongodb') {
                await execAsync(`docker exec ${containerId} sh -c "mongodump --archive=/tmp/export_file --username ${username} --password ${password} --authenticationDatabase admin"`);
            }
            else {
                throw new common_1.ConflictException('Export chưa được hỗ trợ cho loại Database này');
            }
            await execAsync(`docker cp ${containerId}:/tmp/export_file "${outputPath}"`);
            await execAsync(`docker exec ${containerId} rm -f /tmp/export_file`).catch(() => { });
            await this.prisma.databaseActivityLog.create({
                data: { databaseId: id, action: 'EXPORT', status: 'SUCCESS' }
            });
            return outputPath;
        }
        catch (err) {
            this.logger.error(`Export failed: ${err.message}`);
            await this.prisma.databaseActivityLog.create({
                data: { databaseId: id, action: 'EXPORT', status: 'FAILED', message: err.message }
            });
            throw new common_1.InternalServerErrorException(`Quá trình export thất bại: ${err.message}`);
        }
    }
};
exports.DatabasesService = DatabasesService;
exports.DatabasesService = DatabasesService = DatabasesService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        docker_service_1.DockerService])
], DatabasesService);
//# sourceMappingURL=databases.service.js.map