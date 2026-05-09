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
var NginxService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.NginxService = void 0;
const common_1 = require("@nestjs/common");
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
let NginxService = NginxService_1 = class NginxService {
    logger = new common_1.Logger(NginxService_1.name);
    configDir = path.resolve(process.cwd(), 'nginx_configs');
    constructor() {
        if (!fs.existsSync(this.configDir)) {
            fs.mkdirSync(this.configDir, { recursive: true });
            this.logger.log(`📁 Created Nginx config directory: ${this.configDir}`);
        }
    }
    generateProxyConfig(subdomain, hostPort, projectName, customDomain, sslActive = false) {
        const serverName = customDomain
            ? `${subdomain}.potato.local ${customDomain}`
            : `${subdomain}.potato.local`;
        let config = '';
        const sslCertPath = path.resolve(process.cwd(), 'ssl_certs', customDomain || subdomain, 'fullchain.pem');
        const sslKeyPath = path.resolve(process.cwd(), 'ssl_certs', customDomain || subdomain, 'privkey.pem');
        if (sslActive) {
            config += `
server {
    listen 80;
    server_name ${serverName};
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl;
    server_name ${serverName};

    ssl_certificate     "${sslCertPath}";
    ssl_certificate_key "${sslKeyPath}";

    # SSL optimizations
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;

    access_log /var/log/nginx/${subdomain}.ssl.access.log;
    error_log  /var/log/nginx/${subdomain}.ssl.error.log;

    location / {
        proxy_pass         http://127.0.0.1:${hostPort};
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
`;
        }
        else {
            config = `
server {
    listen 80;
    server_name ${serverName};

    access_log /var/log/nginx/${subdomain}.access.log;
    error_log  /var/log/nginx/${subdomain}.error.log;

    location / {
        proxy_pass         http://127.0.0.1:${hostPort};
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
`;
        }
        const finalConfig = config.trim();
        try {
            const filePath = path.join(this.configDir, `${subdomain}.conf`);
            fs.writeFileSync(filePath, finalConfig);
            this.logger.log(`📄 Nginx config written to: ${filePath}`);
        }
        catch (err) {
            this.logger.error(`❌ Failed to write Nginx config for ${subdomain}: ${err.message}`);
        }
        this.logger.log(`\n🥔 Nginx status: ${sslActive ? 'SSL/HTTPS (Forced)' : 'HTTP Standard'}\n`);
        this.logger.log(`Nginx config preview:\n${finalConfig}`);
        return finalConfig;
    }
    removeProxyConfig(subdomain) {
        const filePath = path.join(this.configDir, `${subdomain}.conf`);
        if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
            this.logger.log(`🗑️ Deleted Nginx config: ${filePath}`);
        }
        else {
            this.logger.warn(`⚠️ Nginx config not found for removal: ${filePath}`);
        }
    }
};
exports.NginxService = NginxService;
exports.NginxService = NginxService = NginxService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [])
], NginxService);
//# sourceMappingURL=nginx.service.js.map