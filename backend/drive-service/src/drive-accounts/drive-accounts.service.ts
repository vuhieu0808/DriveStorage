import { Injectable } from '@nestjs/common';
import { CreateDriveAccountDto } from './dto/create-drive-account.dto';
import { UpdateDriveAccountDto } from './dto/update-drive-account.dto';

@Injectable()
export class DriveAccountsService {
  create(createDriveAccountDto: CreateDriveAccountDto) {
    return 'This action adds a new driveAccount';
  }

  findAll() {
    return `This action returns all driveAccounts`;
  }

  findOne(id: number) {
    return `This action returns a #${id} driveAccount`;
  }

  update(id: number, updateDriveAccountDto: UpdateDriveAccountDto) {
    return `This action updates a #${id} driveAccount`;
  }

  remove(id: number) {
    return `This action removes a #${id} driveAccount`;
  }
}
