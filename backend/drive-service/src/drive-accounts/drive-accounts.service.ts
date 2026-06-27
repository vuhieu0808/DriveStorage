import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { DriveAccount } from './entities/drive-account.entity';
import { GoogleOAuthService } from './google-oauth.service';
import { GoogleDriveClientService } from './google-drive-client.service';

@Injectable()
export class DriveAccountsService {
  constructor(
    @InjectRepository(DriveAccount)
    private readonly driveAccountsRepository: Repository<DriveAccount>,
    private readonly googleOAuthService: GoogleOAuthService,
    private readonly googleDriveClientService: GoogleDriveClientService,
  ) {}

  getAuthUrl(userId: string): string {
    return this.googleOAuthService.getAuthUrl(userId);
  }

  async handleOAuthCallback(code: string, state: string) {
    const userId = state;
    if (!userId) {
      throw new BadRequestException('Invalid state parameter');
    }

    // Exchange code for tokens
    const tokens = await this.googleOAuthService.exchangeCode(code);

    // Get storage quota and email
    const quota = await this.googleDriveClientService.getStorageQuota(
      tokens.accessToken!,
      tokens.refreshToken!,
    );

    // Check if account already exists for this user
    const existing = await this.driveAccountsRepository.findOne({
      where: {
        userId: userId,
        email: quota.email,
      },
    });

    if (existing) {
      // Update existing account
      existing.accessToken = tokens.accessToken || null;
      existing.refreshToken = tokens.refreshToken!;
      existing.totalSpace = quota.totalSpace;
      existing.usedSpace = quota.usedSpace;
      existing.status = 'online';
      return this.driveAccountsRepository.save(existing);
    }

    // Create new account
    const driveAccount = this.driveAccountsRepository.create({
      userId: userId,
      email: quota.email,
      accessToken: tokens.accessToken || null,
      refreshToken: tokens.refreshToken!,
      totalSpace: quota.totalSpace,
      usedSpace: quota.usedSpace,
      status: 'online',
    });

    return this.driveAccountsRepository.save(driveAccount);
  }

  async findAllByUserId(userId: string): Promise<DriveAccount[]> {
    return this.driveAccountsRepository.find({
      where: { userId },
      order: { email: 'ASC' },
    });
  }

  async findOne(id: string, userId: string): Promise<DriveAccount> {
    const account = await this.driveAccountsRepository.findOne({
      where: { id, userId },
    });
    if (!account) {
      throw new NotFoundException('Drive account not found');
    }
    return account;
  }

  async refreshAccountToken(id: string, userId: string) {
    const account = await this.findOne(id, userId);

    try {
      const newTokens = await this.googleOAuthService.refreshAccessToken(
        account.refreshToken,
      );

      account.accessToken = newTokens.accessToken || null;
      account.status = 'online';

      return this.driveAccountsRepository.save(account);
    } catch (error) {
      account.status = 'error';
      await this.driveAccountsRepository.save(account);
      throw error;
    }
  }

  async refreshQuota(id: string, userId: string): Promise<DriveAccount> {
    const account = await this.findOne(id, userId);

    try {
      const quota = await this.googleDriveClientService.getStorageQuota(
        account.accessToken!,
        account.refreshToken,
      );

      account.totalSpace = quota.totalSpace;
      account.usedSpace = quota.usedSpace;
      account.status = 'online';

      return this.driveAccountsRepository.save(account);
    } catch (error) {
      // Try to refresh token first
      await this.refreshAccountToken(id, userId);
      // Retry quota fetch
      const refreshedAccount = await this.findOne(id, userId);
      const quota = await this.googleDriveClientService.getStorageQuota(
        refreshedAccount.accessToken!,
        refreshedAccount.refreshToken,
      );

      refreshedAccount.totalSpace = quota.totalSpace;
      refreshedAccount.usedSpace = quota.usedSpace;

      return this.driveAccountsRepository.save(refreshedAccount);
    }
  }

  async remove(id: string, userId: string) {
    const account = await this.findOne(id, userId);

    // Revoke token
    if (account.refreshToken) {
      await this.googleOAuthService.revokeToken(account.refreshToken);
    }

    await this.driveAccountsRepository.remove(account);
  }
}
