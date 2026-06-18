import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { DriveAccountsService } from './drive-accounts.service';
import { CreateDriveAccountDto } from './dto/create-drive-account.dto';
import { UpdateDriveAccountDto } from './dto/update-drive-account.dto';

@Controller('drive-accounts')
export class DriveAccountsController {
  constructor(private readonly driveAccountsService: DriveAccountsService) {}

  @Post()
  create(@Body() createDriveAccountDto: CreateDriveAccountDto) {
    return this.driveAccountsService.create(createDriveAccountDto);
  }

  @Get()
  findAll() {
    return this.driveAccountsService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.driveAccountsService.findOne(+id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateDriveAccountDto: UpdateDriveAccountDto) {
    return this.driveAccountsService.update(+id, updateDriveAccountDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.driveAccountsService.remove(+id);
  }
}
