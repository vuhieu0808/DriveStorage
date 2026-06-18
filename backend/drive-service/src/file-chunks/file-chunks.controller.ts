import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { FileChunksService } from './file-chunks.service';
import { CreateFileChunkDto } from './dto/create-file-chunk.dto';
import { UpdateFileChunkDto } from './dto/update-file-chunk.dto';

@Controller('file-chunks')
export class FileChunksController {
  constructor(private readonly fileChunksService: FileChunksService) {}

  @Post()
  create(@Body() createFileChunkDto: CreateFileChunkDto) {
    return this.fileChunksService.create(createFileChunkDto);
  }

  @Get()
  findAll() {
    return this.fileChunksService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.fileChunksService.findOne(+id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateFileChunkDto: UpdateFileChunkDto) {
    return this.fileChunksService.update(+id, updateFileChunkDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.fileChunksService.remove(+id);
  }
}
