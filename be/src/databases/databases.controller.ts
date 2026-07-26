import { Controller, Get, Post, Body, Param, Delete, Patch, ParseIntPipe, UseGuards, UseInterceptors, UploadedFile, Res, ConflictException, Request } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import type { Response } from 'express';
import * as fs from 'fs';
import { DatabasesService } from './databases.service';
import { CreateDatabaseDto } from './dto/create-database.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('databases')
@UseGuards(JwtAuthGuard)
export class DatabasesController {
  constructor(private readonly databasesService: DatabasesService) { }

  @Get()
  findAll(@Request() req: any) {
    return this.databasesService.findAll(req.user.id);
  }

  @Post()
  create(@Body() createDbDto: CreateDatabaseDto) {
    return this.databasesService.create(createDbDto);
  }

  @Get(':id/logs')
  getLogs(@Param('id', ParseIntPipe) id: number) {
    return this.databasesService.getLogs(id);
  }

  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.databasesService.remove(id);
  }

  @Patch(':id/password')
  changePassword(
    @Param('id', ParseIntPipe) id: number,
    @Body('newPassword') newPassword: string,
  ) {
    return this.databasesService.changePassword(id, newPassword);
  }

  @Post(':id/import')
  @UseInterceptors(FileInterceptor('file', { dest: './uploads' }))
  async importDatabase(
    @Param('id', ParseIntPipe) id: number,
    @UploadedFile() file: Express.Multer.File,
  ) {
    if (!file) throw new ConflictException('Vui lòng chọn file');
    return this.databasesService.importDatabase(id, file.path, file.originalname);
  }

  @Get(':id/export')
  async exportDatabase(
    @Param('id', ParseIntPipe) id: number,
    @Res() res: Response,
  ) {
    const filePath = await this.databasesService.exportDatabase(id);
    const dbs = await this.databasesService.findAll();
    const db = dbs.find((d: any) => d.id === id);

    const ext = db?.type === 'mongodb' ? 'archive' : 'sql';
    const filename = `${db?.name || 'database'}_${db?.type || 'db'}_export_${Date.now()}.${ext}`;

    res.setHeader('Content-Type', 'application/octet-stream');
    res.download(filePath, filename, (err) => {
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    });
  }

  @Post(':id/backups')
  async createBackup(@Param('id', ParseIntPipe) id: number) {
    const filename = await this.databasesService.createBackup(id);
    return { success: true, filename };
  }

  @Get(':id/backups')
  async listBackups(@Param('id', ParseIntPipe) id: number) {
    return this.databasesService.listBackups(id);
  }

  @Get(':id/backups/:filename')
  async downloadBackup(
    @Param('id', ParseIntPipe) id: number,
    @Param('filename') filename: string,
    @Res() res: Response,
  ) {
    const filePath = await this.databasesService.getBackupFilePath(id, filename);
    res.download(filePath, filename);
  }

  @Post(':id/backups/:filename/restore')
  async restoreBackup(
    @Param('id', ParseIntPipe) id: number,
    @Param('filename') filename: string,
  ) {
    return this.databasesService.restoreFromBackup(id, filename);
  }

  @Post(':id/query')
  runQuery(
    @Param('id', ParseIntPipe) id: number,
    @Body('query') query: string,
  ) {
    if (!query || query.trim() === '') {
      throw new ConflictException('Vui lòng điền câu lệnh SQL');
    }
    return this.databasesService.runQuery(id, query);
  }
}
