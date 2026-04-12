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
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
var ProjectsController_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.ProjectsController = void 0;
const common_1 = require("@nestjs/common");
const projects_service_1 = require("./projects.service");
const create_project_dto_1 = require("./dto/create-project.dto");
const create_env_variable_dto_1 = require("./dto/create-env-variable.dto");
const update_resources_dto_1 = require("./dto/update-resources.dto");
const git_deploy_dto_1 = require("./dto/git-deploy.dto");
let ProjectsController = ProjectsController_1 = class ProjectsController {
    projectsService;
    logger = new common_1.Logger(ProjectsController_1.name);
    constructor(projectsService) {
        this.projectsService = projectsService;
    }
    async create(createProjectDto) {
        this.logger.log(`POST /projects — Creating "${createProjectDto.name}" for user ${createProjectDto.userId}`);
        return this.projectsService.createProject(createProjectDto.userId, createProjectDto.name);
    }
    async findAll() {
        this.logger.log('GET /projects — Listing all projects');
        return this.projectsService.findAll();
    }
    async findOne(id) {
        this.logger.log(`GET /projects/${id}`);
        return this.projectsService.findOne(id);
    }
    async getStats(id) {
        this.logger.log(`GET /projects/${id}/stats`);
        return this.projectsService.getProjectStats(id);
    }
    async start(id) {
        this.logger.log(`PATCH /projects/${id}/start`);
        return this.projectsService.startProject(id);
    }
    async stop(id) {
        this.logger.log(`PATCH /projects/${id}/stop`);
        return this.projectsService.stopProject(id);
    }
    async remove(id) {
        this.logger.log(`DELETE /projects/${id}`);
        return this.projectsService.deleteProject(id);
    }
    async updateDomain(id, customDomain) {
        this.logger.log(`PATCH /projects/${id}/domain — Binding to "${customDomain}"`);
        return this.projectsService.updateDomain(id, customDomain);
    }
    async enableSsl(id) {
        this.logger.log(`PATCH /projects/${id}/ssl/enable`);
        return this.projectsService.enableHttps(id);
    }
    async downloadLogs(id) {
        this.logger.log(`GET /projects/${id}/logs/download`);
        const logs = await this.projectsService.getProjectLogs(id);
        const project = await this.projectsService.findOne(id);
        return {
            filename: `potato-${project.name.toLowerCase()}-logs.txt`,
            content: logs,
        };
    }
    async getEnvVariables(id) {
        return this.projectsService.getEnvVariables(id);
    }
    async addEnvVariable(id, dto) {
        return this.projectsService.addEnvVariable(id, dto.key, dto.value, dto.isSecret ?? false);
    }
    async deleteEnvVariable(id, envId) {
        return this.projectsService.deleteEnvVariable(id, envId);
    }
    async updateResources(id, dto) {
        this.logger.log(`PATCH /projects/${id}/resources — RAM=${dto.ramLimit}MB, CPU=${dto.cpuLimit}`);
        return this.projectsService.updateResources(id, dto.ramLimit ?? 256, dto.cpuLimit ?? 1);
    }
    async deploy(id, dto) {
        this.logger.log(`POST /projects/${id}/deploy — Repo: ${dto.gitRepo}`);
        return this.projectsService.deployFromGit(id, dto.gitRepo, dto.deployBranch ?? 'main');
    }
    async getDeployments(id) {
        return this.projectsService.getDeployments(id);
    }
};
exports.ProjectsController = ProjectsController;
__decorate([
    (0, common_1.Post)(),
    (0, common_1.HttpCode)(common_1.HttpStatus.CREATED),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [create_project_dto_1.CreateProjectDto]),
    __metadata("design:returntype", Promise)
], ProjectsController.prototype, "create", null);
__decorate([
    (0, common_1.Get)(),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], ProjectsController.prototype, "findAll", null);
__decorate([
    (0, common_1.Get)(':id'),
    __param(0, (0, common_1.Param)('id', common_1.ParseIntPipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number]),
    __metadata("design:returntype", Promise)
], ProjectsController.prototype, "findOne", null);
__decorate([
    (0, common_1.Get)(':id/stats'),
    __param(0, (0, common_1.Param)('id', common_1.ParseIntPipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number]),
    __metadata("design:returntype", Promise)
], ProjectsController.prototype, "getStats", null);
__decorate([
    (0, common_1.Patch)(':id/start'),
    __param(0, (0, common_1.Param)('id', common_1.ParseIntPipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number]),
    __metadata("design:returntype", Promise)
], ProjectsController.prototype, "start", null);
__decorate([
    (0, common_1.Patch)(':id/stop'),
    __param(0, (0, common_1.Param)('id', common_1.ParseIntPipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number]),
    __metadata("design:returntype", Promise)
], ProjectsController.prototype, "stop", null);
__decorate([
    (0, common_1.Delete)(':id'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    __param(0, (0, common_1.Param)('id', common_1.ParseIntPipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number]),
    __metadata("design:returntype", Promise)
], ProjectsController.prototype, "remove", null);
__decorate([
    (0, common_1.Patch)(':id/domain'),
    __param(0, (0, common_1.Param)('id', common_1.ParseIntPipe)),
    __param(1, (0, common_1.Body)('customDomain')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number, String]),
    __metadata("design:returntype", Promise)
], ProjectsController.prototype, "updateDomain", null);
__decorate([
    (0, common_1.Patch)(':id/ssl/enable'),
    __param(0, (0, common_1.Param)('id', common_1.ParseIntPipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number]),
    __metadata("design:returntype", Promise)
], ProjectsController.prototype, "enableSsl", null);
__decorate([
    (0, common_1.Get)(':id/logs/download'),
    __param(0, (0, common_1.Param)('id', common_1.ParseIntPipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number]),
    __metadata("design:returntype", Promise)
], ProjectsController.prototype, "downloadLogs", null);
__decorate([
    (0, common_1.Get)(':id/env'),
    __param(0, (0, common_1.Param)('id', common_1.ParseIntPipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number]),
    __metadata("design:returntype", Promise)
], ProjectsController.prototype, "getEnvVariables", null);
__decorate([
    (0, common_1.Post)(':id/env'),
    __param(0, (0, common_1.Param)('id', common_1.ParseIntPipe)),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number, create_env_variable_dto_1.CreateEnvVariableDto]),
    __metadata("design:returntype", Promise)
], ProjectsController.prototype, "addEnvVariable", null);
__decorate([
    (0, common_1.Delete)(':id/env/:envId'),
    __param(0, (0, common_1.Param)('id', common_1.ParseIntPipe)),
    __param(1, (0, common_1.Param)('envId', common_1.ParseIntPipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number, Number]),
    __metadata("design:returntype", Promise)
], ProjectsController.prototype, "deleteEnvVariable", null);
__decorate([
    (0, common_1.Patch)(':id/resources'),
    __param(0, (0, common_1.Param)('id', common_1.ParseIntPipe)),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number, update_resources_dto_1.UpdateResourcesDto]),
    __metadata("design:returntype", Promise)
], ProjectsController.prototype, "updateResources", null);
__decorate([
    (0, common_1.Post)(':id/deploy'),
    __param(0, (0, common_1.Param)('id', common_1.ParseIntPipe)),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number, git_deploy_dto_1.GitDeployDto]),
    __metadata("design:returntype", Promise)
], ProjectsController.prototype, "deploy", null);
__decorate([
    (0, common_1.Get)(':id/deployments'),
    __param(0, (0, common_1.Param)('id', common_1.ParseIntPipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number]),
    __metadata("design:returntype", Promise)
], ProjectsController.prototype, "getDeployments", null);
exports.ProjectsController = ProjectsController = ProjectsController_1 = __decorate([
    (0, common_1.Controller)('projects'),
    __metadata("design:paramtypes", [projects_service_1.ProjectsService])
], ProjectsController);
//# sourceMappingURL=projects.controller.js.map