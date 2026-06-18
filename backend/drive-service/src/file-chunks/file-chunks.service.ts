import { Injectable } from '@nestjs/common';
import { CreateFileChunkDto } from './dto/create-file-chunk.dto';
import { UpdateFileChunkDto } from './dto/update-file-chunk.dto';

@Injectable()
export class FileChunksService {
  create(createFileChunkDto: CreateFileChunkDto) {
    return 'This action adds a new fileChunk';
  }

  findAll() {
    return `This action returns all fileChunks`;
  }

  findOne(id: number) {
    return `This action returns a #${id} fileChunk`;
  }

  update(id: number, updateFileChunkDto: UpdateFileChunkDto) {
    return `This action updates a #${id} fileChunk`;
  }

  remove(id: number) {
    return `This action removes a #${id} fileChunk`;
  }
}
