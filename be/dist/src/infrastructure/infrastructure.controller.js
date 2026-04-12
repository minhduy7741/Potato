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
var InfrastructureController_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.InfrastructureController = void 0;
const common_1 = require("@nestjs/common");
const fs = __importStar(require("fs"));
let InfrastructureController = InfrastructureController_1 = class InfrastructureController {
    logger = new common_1.Logger(InfrastructureController_1.name);
    dockerSocketPaths = [
        '/var/run/docker.sock',
        '//./pipe/docker_engine',
    ];
    async healthCheck() {
        this.logger.log('GET /infrastructure/health — Running health check');
        const results = this.dockerSocketPaths.map((socketPath) => {
            try {
                fs.accessSync(socketPath, fs.constants.R_OK);
                return { path: socketPath, accessible: true };
            }
            catch {
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
            this.logger.log(`✅ Health check passed — Docker socket accessible at ${accessible.path}`);
        }
        else {
            this.logger.warn('❌ Health check failed — Docker socket not accessible on any known path');
        }
        return response;
    }
};
exports.InfrastructureController = InfrastructureController;
__decorate([
    (0, common_1.Get)('health'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], InfrastructureController.prototype, "healthCheck", null);
exports.InfrastructureController = InfrastructureController = InfrastructureController_1 = __decorate([
    (0, common_1.Controller)('infrastructure')
], InfrastructureController);
//# sourceMappingURL=infrastructure.controller.js.map