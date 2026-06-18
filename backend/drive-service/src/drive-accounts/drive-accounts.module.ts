import { Module } from '@nestjs/common';
import { DriveAccountsService } from './drive-accounts.service';
import { DriveAccountsController } from './drive-accounts.controller';

@Module({
  controllers: [DriveAccountsController],
  providers: [DriveAccountsService],
})
export class DriveAccountsModule {}
