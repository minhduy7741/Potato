import { Module } from '@nestjs/common';
import { ProjectsController } from './projects.controller';
import { ProjectsService } from './projects.service';

import { StatsGateway } from './stats.gateway';

@Module({
  controllers: [ProjectsController],
  providers: [ProjectsService, StatsGateway],
  exports: [ProjectsService],
})
export class ProjectsModule {}
