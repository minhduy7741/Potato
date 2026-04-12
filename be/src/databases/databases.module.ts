import { Module } from '@nestjs/common';
import { DatabasesService } from './databases.service';
import { DatabasesController } from './databases.controller';
import { DockerModule } from '../docker/docker.module';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [DockerModule, PrismaModule],
  controllers: [DatabasesController],
  providers: [DatabasesService],
  exports: [DatabasesService],
})
export class DatabasesModule {}
