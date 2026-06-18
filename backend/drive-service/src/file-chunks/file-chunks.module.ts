import { Module } from '@nestjs/common';
import { FileChunksService } from './file-chunks.service';
import { FileChunksController } from './file-chunks.controller';

@Module({
  controllers: [FileChunksController],
  providers: [FileChunksService],
})
export class FileChunksModule {}
