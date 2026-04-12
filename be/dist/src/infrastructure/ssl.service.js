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
var SslService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.SslService = void 0;
const common_1 = require("@nestjs/common");
const schedule_1 = require("@nestjs/schedule");
const prisma_service_1 = require("../prisma/prisma.service");
const nginx_service_1 = require("./nginx.service");
let SslService = SslService_1 = class SslService {
    prisma;
    nginxService;
    logger = new common_1.Logger(SslService_1.name);
    constructor(prisma, nginxService) {
        this.prisma = prisma;
        this.nginxService = nginxService;
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
                this.nginxService.generateProxyConfig(project.subdomain, 10000, project.name, project.customDomain || undefined, true);
                this.logger.log(`✅ Successfully renewed certificate for ${project.name}`);
            }
            catch (error) {
                this.logger.error(`❌ Failed to renew certificate for ${project.name}: ${error.message}`);
            }
        }
    }
    async issueCertificate(domain) {
        this.logger.log(`🛡️  Issuing SSL certificate for domain: ${domain}...`);
        await new Promise((resolve) => setTimeout(resolve, 2000));
        const now = new Date();
        const expiry = new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000);
        return {
            expiry,
            certPath: `/etc/potato/ssl/${domain}/fullchain.pem`,
            keyPath: `/etc/potato/ssl/${domain}/privkey.pem`,
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