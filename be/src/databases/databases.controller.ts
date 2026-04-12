import { Controller, Get, Post, Body, Param, Delete, ParseIntPipe } from '@nestjs/common';
import { DatabasesService } from './databases.service';
import { CreateDatabaseDto } from './dto/create-database.dto';

@Controller('databases')
export class DatabasesController {
  constructor(private readonly databasesService: DatabasesService) {}

  @Get()
  findAll() {
    return this.databasesService.findAll();
  }

  @Post()
  create(@Body() createDbDto: CreateDatabaseDto) {
    return this.databasesService.create(createDbDto);
  }

  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.databasesService.remove(id);
  }
}
