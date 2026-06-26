import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DriveAccountsService } from './drive-accounts.service';
import { DriveAccountsController } from './drive-accounts.controller';
import { DriveAccount } from './entities/drive-account.entity';
import { GoogleOAuthService } from './google-oauth.service';
import { GoogleDriveClientService } from './google-drive-client.service';

@Module({
  imports: [TypeOrmModule.forFeature([DriveAccount])],
  controllers: [DriveAccountsController],
  providers: [
    DriveAccountsService,
    GoogleOAuthService,
    GoogleDriveClientService,
  ],
  exports: [GoogleDriveClientService, DriveAccountsService],
})
export class DriveAccountsModule {}
