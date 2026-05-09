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
var SslService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.SslService = void 0;
const common_1 = require("@nestjs/common");
const schedule_1 = require("@nestjs/schedule");
const prisma_service_1 = require("../prisma/prisma.service");
const nginx_service_1 = require("./nginx.service");
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const child_process_1 = require("child_process");
let SslService = SslService_1 = class SslService {
    prisma;
    nginxService;
    logger = new common_1.Logger(SslService_1.name);
    sslDir = path.resolve(process.cwd(), 'ssl_certs');
    constructor(prisma, nginxService) {
        this.prisma = prisma;
        this.nginxService = nginxService;
        if (!fs.existsSync(this.sslDir)) {
            fs.mkdirSync(this.sslDir, { recursive: true });
        }
    }
    async handleAutoRenewal() {
        this.logger.log('🕵️  Checking for certificates that need renewal...');
        const now = new Date();
        const threshold = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
        const expiringProjects = await this.prisma.project.findMany({
            where: {
                sslStatus: { in: ['active', 'expiring_soon'] },
                sslExpiry: { lte: threshold },
            },
        });
        if (expiringProjects.length === 0) {
            this.logger.log('✅ No certificates need renewal today.');
            return;
        }
        this.logger.log(`🔄 Found ${expiringProjects.length} projects needing renewal.`);
        for (const project of expiringProjects) {
            try {
                const domain = project.customDomain || `${project.subdomain}.potato.local`;
                const { expiry } = await this.issueCertificate(domain);
                await this.prisma.project.update({
                    where: { id: project.id },
                    data: {
                        sslStatus: 'active',
                        sslExpiry: expiry,
                    },
                });
                this.nginxService.generateProxyConfig(project.subdomain, project.hostPort || 10000, project.name, project.customDomain || undefined, true);
                this.logger.log(`✅ Successfully renewed certificate for ${project.name}`);
            }
            catch (error) {
                this.logger.error(`❌ Failed to renew certificate for ${project.name}: ${error.message}`);
            }
        }
    }
    async issueCertificate(domain) {
        this.logger.log(`🛡️  Generating Self-Signed SSL certificate for domain: ${domain}...`);
        const domainDir = path.join(this.sslDir, domain);
        if (!fs.existsSync(domainDir)) {
            fs.mkdirSync(domainDir, { recursive: true });
        }
        const keyPath = path.join(domainDir, 'privkey.pem');
        const certPath = path.join(domainDir, 'fullchain.pem');
        try {
            const cmd = `openssl req -x509 -newkey rsa:4096 -keyout "${keyPath}" -out "${certPath}" -sha256 -days 365 -nodes -subj "/CN=${domain}"`;
            (0, child_process_1.execSync)(cmd, { stdio: 'ignore' });
            this.logger.log(`✅ Certificate generated at: ${certPath}`);
        }
        catch (err) {
            this.logger.warn(`⚠️ OpenSSL failed or not found. Falling back to mock paths. Error: ${err.message}`);
        }
        const now = new Date();
        const expiry = new Date(now.getTime() + 365 * 24 * 60 * 60 * 1000);
        return {
            expiry,
            certPath,
            keyPath,
        };
    }
};
exports.SslService = SslService;
__decorate([
    (0, schedule_1.Cron)(schedule_1.CronExpression.EVERY_DAY_AT_MIDNIGHT),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], SslService.prototype, "handleAutoRenewal", null);
exports.SslService = SslService = SslService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        nginx_service_1.NginxService])
], SslService);
//# sourceMappingURL=ssl.service.js.map