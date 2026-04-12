import { Injectable, Logger } from '@nestjs/common';

/**
 * NginxService — Generates Nginx reverse-proxy configurations for project containers.
 *
 * When a new project is created, this service builds an Nginx `server` block
 * that proxies traffic from the project's subdomain to the container's host port.
 *
 * For now, the generated config is logged to the console.
 * In the future, it will be written to the Nginx config directory and trigger a reload.
 */
@Injectable()
export class NginxService {
  private readonly logger = new Logger(NginxService.name);

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
  ): string {
    const serverName = customDomain 
      ? `${subdomain}.potato.local ${customDomain}` 
      : `${subdomain}.potato.local`;

    let config = '';

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
    } else {
      // Basic HTTP config
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

  /**
   * Generates a removal notice when a project is deleted.
   * In the future, this will remove the config file and reload Nginx.
   *
   * @param subdomain - The subdomain whose config should be removed
   */
  removeProxyConfig(subdomain: string): void {
    this.logger.log(
      `🗑️  Nginx config for "${subdomain}.potato.local" marked for removal`,
    );
    // TODO: Delete /etc/nginx/sites-enabled/${subdomain}.conf
    // TODO: Trigger `nginx -s reload`
  }
}
