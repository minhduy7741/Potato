import { Controller, Get, Patch, Body, UseGuards, Request, ForbiddenException } from '@nestjs/common';
import { SystemService } from './system.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('system')
export class SystemController {
  constructor(private readonly systemService: SystemService) {}

  @Get('config/public')
  async getPublicConfig() {
    return this.systemService.getPublicConfig();
  }

  @Get('config')
  @UseGuards(JwtAuthGuard)
  async getConfig(@Request() req: any) {
    if (req.user?.role !== 'ADMIN' || req.user?.email !== 'superadmin@potato.com') {
      throw new ForbiddenException('Chỉ SuperAdmin mới có quyền xem cấu hình này');
    }
    return this.systemService.getConfig();
  }

  @Patch('config')
  @UseGuards(JwtAuthGuard)
  async updateConfig(
    @Request() req: any,
    @Body('isChatbotEnabled') isChatbotEnabled?: boolean,
    @Body('chatbotSystemPrompt') chatbotSystemPrompt?: string,
  ) {
    if (req.user?.role !== 'ADMIN' || req.user?.email !== 'superadmin@potato.com') {
      throw new ForbiddenException('Chỉ SuperAdmin mới có quyền sửa cấu hình này');
    }
    return this.systemService.updateConfig(isChatbotEnabled, chatbotSystemPrompt);
  }
}
