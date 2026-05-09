import { Module } from '@nestjs/common';
import { ProjectsController } from './projects.controller';
import { ProjectsService } from './projects.service';
import { StatsGateway } from './stats.gateway';
import { StatsCollectorService } from './stats-collector.service';
import { DatabasesModule } from '../databases/databases.module';

@Module({
  imports: [DatabasesModule],
  controllers: [ProjectsController],
  providers: [ProjectsService, StatsGateway, StatsCollectorService],
  exports: [ProjectsService],
})
export class ProjectsModule {}
