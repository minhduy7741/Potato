import { Module, forwardRef } from '@nestjs/common';
import { ProjectsController } from './projects.controller';
import { ProjectsService } from './projects.service';
import { StatsGateway } from './stats.gateway';
import { StatsCollectorService } from './stats-collector.service';
import { DatabasesModule } from '../databases/databases.module';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [DatabasesModule, forwardRef(() => AuthModule)],
  controllers: [ProjectsController],
  providers: [ProjectsService, StatsGateway, StatsCollectorService],
  exports: [ProjectsService],
})
export class ProjectsModule {}
