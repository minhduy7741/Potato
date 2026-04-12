"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var DatabasesService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.DatabasesService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
const docker_service_1 = require("../docker/docker.service");
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
            include: { project: true },
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
        await this.prisma.databaseInstance.delete({ where: { id } });
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
};
exports.DatabasesService = DatabasesService;
exports.DatabasesService = DatabasesService = DatabasesService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        docker_service_1.DockerService])
], DatabasesService);
//# sourceMappingURL=databases.service.js.map