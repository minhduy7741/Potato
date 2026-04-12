import { Injectable, Logger, Inject, forwardRef } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';
import { NginxService } from './nginx.service';

@Injectable()
export class SslService {
  private readonly logger = new Logger(SslService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly nginxService: NginxService,
  ) {}

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
          10000, 
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
   * Simulates issuing a certificate via Certbot.
   */
  async issueCertificate(domain: string): Promise<{ expiry: Date; certPath: string; keyPath: string }> {
    this.logger.log(`🛡️  Issuing SSL certificate for domain: ${domain}...`);
    
    // Simulate network delay
    await new Promise((resolve) => setTimeout(resolve, 2000));

    const now = new Date();
    const expiry = new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000); // 90 days from now

    // Mock paths
    return {
      expiry,
      certPath: `/etc/potato/ssl/${domain}/fullchain.pem`,
      keyPath: `/etc/potato/ssl/${domain}/privkey.pem`,
    };
  }
}
