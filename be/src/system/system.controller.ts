import { Controller, Get, Patch, Body, UseGuards } from '@nestjs/common';
import { SystemService } from './system.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role } from '@prisma/client';

@Controller('system')
export class SystemController {
  constructor(private readonly systemService: SystemService) {}

  @Get('config/public')
  async getPublicConfig() {
    return this.systemService.getPublicConfig();
  }

  @Get('config')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  async getConfig() {
    return this.systemService.getConfig();
  }

  @Patch('config')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  async updateConfig(
    @Body('isChatbotEnabled') isChatbotEnabled?: boolean,
    @Body('chatbotSystemPrompt') chatbotSystemPrompt?: string,
  ) {
    return this.systemService.updateConfig(isChatbotEnabled, chatbotSystemPrompt);
  }
}
