import { Module, ValidationPipe } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma/prisma.module';
import { DockerModule } from './docker/docker.module';
import { LogsModule } from './logs/logs.module';
import { ProjectsModule } from './projects/projects.module';
import { InfrastructureModule } from './infrastructure/infrastructure.module';

import { AuthModule } from './auth/auth.module';
import { DatabasesModule } from './databases/databases.module';
import { APP_PIPE } from '@nestjs/core';

import { ScheduleModule } from '@nestjs/schedule';

@Module({
  imports: [
    ScheduleModule.forRoot(),
    PrismaModule, 
    DockerModule, 
    LogsModule, 
    ProjectsModule, 
    InfrastructureModule, 
    AuthModule,
    DatabasesModule
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
