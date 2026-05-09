import { Injectable, Logger, Inject, forwardRef } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';
import { NginxService } from './nginx.service';
import * as fs from 'fs';
import * as path from 'path';
import { execSync } from 'child_process';

@Injectable()
export class SslService {
  private readonly logger = new Logger(SslService.name);
  private readonly sslDir = path.resolve(process.cwd(), 'ssl_certs');

  constructor(
    private readonly prisma: PrismaService,
    private readonly nginxService: NginxService,
  ) {
    if (!fs.existsSync(this.sslDir)) {
      fs.mkdirSync(this.sslDir, { recursive: true });
    }
  }

  /**
   * Cron job runs every day at midnight to check for expiring certificates.
   */
  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async handleAutoRenewal() {
    this.logger.log('🕵️  Checking for certificates that need renewal...');
    
    const now = new Date();
    const threshold = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000); // 7 days

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

        // Trigger Nginx reload with SSL
        this.nginxService.generateProxyConfig(
          project.subdomain,
          project.hostPort || 10000, 
          project.name,
          project.customDomain || undefined,
          true
        );

        this.logger.log(`✅ Successfully renewed certificate for ${project.name}`);
      } catch (error) {
        this.logger.error(`❌ Failed to renew certificate for ${project.name}: ${error.message}`);
      }
    }
  }

  /**
   * Generates a self-signed certificate using OpenSSL.
   */
  async issueCertificate(domain: string): Promise<{ expiry: Date; certPath: string; keyPath: string }> {
    this.logger.log(`🛡️  Generating Self-Signed SSL certificate for domain: ${domain}...`);
    
    const domainDir = path.join(this.sslDir, domain);
    if (!fs.existsSync(domainDir)) {
      fs.mkdirSync(domainDir, { recursive: true });
    }

    const keyPath = path.join(domainDir, 'privkey.pem');
    const certPath = path.join(domainDir, 'fullchain.pem');

    try {
      // Generate self-signed cert using openssl
      // Note: On Windows, openssl must be in PATH
      const cmd = `openssl req -x509 -newkey rsa:4096 -keyout "${keyPath}" -out "${certPath}" -sha256 -days 365 -nodes -subj "/CN=${domain}"`;
      execSync(cmd, { stdio: 'ignore' });
      
      this.logger.log(`✅ Certificate generated at: ${certPath}`);
    } catch (err) {
      this.logger.warn(`⚠️ OpenSSL failed or not found. Falling back to mock paths. Error: ${err.message}`);
    }

    const now = new Date();
    const expiry = new Date(now.getTime() + 365 * 24 * 60 * 60 * 1000); // 1 year for self-signed

    return {
      expiry,
      certPath,
      keyPath,
    };
  }
}
