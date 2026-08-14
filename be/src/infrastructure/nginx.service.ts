import { Injectable, Logger } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';
import { exec } from 'child_process';

@Injectable()
export class NginxService {
  private readonly logger = new Logger(NginxService.name);
  private readonly configDir = process.env.NGINX_CONF_DIR || path.resolve(process.cwd(), 'nginx_configs');

  constructor() {
    if (!fs.existsSync(this.configDir)) {
      fs.mkdirSync(this.configDir, { recursive: true });
      this.logger.log(`📁 Created Nginx config directory: ${this.configDir}`);
    }
  }

  /**
   * Generates a basic Nginx reverse-proxy configuration for a project container.
   *
   * @param subdomain  - The unique subdomain assigned to the project (e.g. "my-app-a1b2c3d4")
   * @param hostPort   - The host port the container is mapped to (e.g. 10042)
   * @param projectName - Human-readable project name (used in comments)
   * @returns The generated Nginx config string
   */
  generateProxyConfig(
    subdomain: string,
    hostPort: number,
    projectName: string,
    customDomain?: string,
    sslActive: boolean = false,
    targetPort: string = '80'
  ): string {
    const baseDomain = process.env.BASE_DOMAIN || 'potato.local';
    const serverName = customDomain 
      ? `${subdomain}.${baseDomain} ${customDomain}` 
      : `${subdomain}.${baseDomain}`;

    let config = '';

    const sslCertPath = path.resolve(process.cwd(), 'ssl_certs', customDomain || subdomain, 'fullchain.pem');
    const sslKeyPath = path.resolve(process.cwd(), 'ssl_certs', customDomain || subdomain, 'privkey.pem');

    const isFastCGI = targetPort === '9000';
    const locationBlock = isFastCGI ? `
    location / {
        fastcgi_pass   127.0.0.1:${hostPort};
        fastcgi_index  index.php;
        fastcgi_param  SCRIPT_FILENAME /var/www/html/public$fastcgi_script_name;
        include        fastcgi_params;
    }` : `
    location / {
        proxy_pass         http://127.0.0.1:${hostPort};
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }`;

    if (sslActive) {
      // Force HTTPS: Redirect port 80 to 443
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
${locationBlock}
}
`;
    } else {
      // Basic HTTP config
      config = `
server {
    listen 80;
    server_name ${serverName};

    access_log /var/log/nginx/${subdomain}.access.log;
    error_log  /var/log/nginx/${subdomain}.error.log;
${locationBlock}
}
`;
    }

    const finalConfig = config.trim();

    // Write to disk
    try {
      const filePath = path.join(this.configDir, `${subdomain}.conf`);
      fs.writeFileSync(filePath, finalConfig);
      this.logger.log(`📄 Nginx config written to: ${filePath}`);
    } catch (err) {
      this.logger.error(`❌ Failed to write Nginx config for ${subdomain}: ${err.message}`);
    }

    this.logger.log(`\n🥔 Nginx status: ${sslActive ? 'SSL/HTTPS (Forced)' : 'HTTP Standard'}\n`);
    this.logger.log(`Nginx config preview:\n${finalConfig}`);

    this.reloadNginx();

    return finalConfig;
  }

  /**
   * Generates a removal notice when a project is deleted.
   * In the future, this will remove the config file and reload Nginx.
   *
   * @param subdomain - The subdomain whose config should be removed
   */
  removeProxyConfig(subdomain: string): void {
    const filePath = path.join(this.configDir, `${subdomain}.conf`);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
      this.logger.log(`🗑️ Deleted Nginx config: ${filePath}`);
      this.reloadNginx();
    } else {
      this.logger.warn(`⚠️ Nginx config not found for removal: ${filePath}`);
    }
  }

  /**
   * Reloads Nginx gracefully
   */
  private reloadNginx(): void {
    exec('sudo nginx -s reload', (error, stdout, stderr) => {
      if (error) {
        this.logger.warn(`⚠️ Could not reload Nginx automatically (Are you on Windows/Dev or is Nginx not running?). Error: ${error.message}`);
        return;
      }
      this.logger.log(`✅ Nginx reloaded successfully.`);
    });
  }
}
