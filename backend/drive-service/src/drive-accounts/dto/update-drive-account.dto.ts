import { PartialType } from '@nestjs/mapped-types';
import { CreateDriveAccountDto } from './create-drive-account.dto';

export class UpdateDriveAccountDto extends PartialType(CreateDriveAccountDto) {}
