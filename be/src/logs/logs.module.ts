import { Module } from '@nestjs/common';
import { LogsGateway } from './logs.gateway';
import { ContainerLogService } from './container-log.service';

@Module({
  providers: [LogsGateway, ContainerLogService],
})
export class LogsModule {}
