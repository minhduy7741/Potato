"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var NginxService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.NginxService = void 0;
const common_1 = require("@nestjs/common");
let NginxService = NginxService_1 = class NginxService {
    logger = new common_1.Logger(NginxService_1.name);
    generateProxyConfig(subdomain, hostPort, projectName, customDomain, sslActive = false) {
        const serverName = customDomain
            ? `${subdomain}.potato.local ${customDomain}`
            : `${subdomain}.potato.local`;
        let config = '';
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

    ssl_certificate     /etc/potato/ssl/${customDomain || subdomain}/fullchain.pem;
    ssl_certificate_key /etc/potato/ssl/${customDomain || subdomain}/privkey.pem;

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
        this.logger.log(`\n🥔 Nginx status: ${sslActive ? 'SSL/HTTPS (Forced)' : 'HTTP Standard'}\n`);
        this.logger.log(`Nginx config preview:\n${finalConfig}`);
        return finalConfig;
    }
    removeProxyConfig(subdomain) {
        this.logger.log(`🗑️  Nginx config for "${subdomain}.potato.local" marked for removal`);
    }
};
exports.NginxService = NginxService;
exports.NginxService = NginxService = NginxService_1 = __decorate([
    (0, common_1.Injectable)()
], NginxService);
//# sourceMappingURL=nginx.service.js.map