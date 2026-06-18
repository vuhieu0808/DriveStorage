import { PartialType } from '@nestjs/mapped-types';
import { CreateFileChunkDto } from './create-file-chunk.dto';

export class UpdateFileChunkDto extends PartialType(CreateFileChunkDto) {}
