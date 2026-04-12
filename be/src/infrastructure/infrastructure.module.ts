import { Global, Module } from '@nestjs/common';
import { NginxService } from './nginx.service';
import { InfrastructureController } from './infrastructure.controller';

/**
 * InfrastructureModule — Provides infrastructure-level services.
 *
 * Responsibilities:
 *   - Nginx proxy configuration generation (NginxService)
 *   - Health-check endpoints (InfrastructureController)
 *
 * Marked as @Global() so NginxService can be injected anywhere
 * without explicitly importing this module.
 */
import { SslService } from './ssl.service';

@Global()
@Module({
  controllers: [InfrastructureController],
  providers: [NginxService, SslService],
  exports: [NginxService, SslService],
})
export class InfrastructureModule {}
