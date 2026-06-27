import {
  Controller,
  Get,
  Delete,
  Param,
  Query,
  Res,
  Post,
  UseGuards,
  Request,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import type { Response } from 'express';
import { DriveAccountsService } from './drive-accounts.service';
import { DriveAccount } from './entities/drive-account.entity';

@Controller('drive-accounts')
export class DriveAccountsController {
  constructor(private readonly driveAccountsService: DriveAccountsService) {}

  @Get('oauth/url')
  @UseGuards(AuthGuard('jwt'))
  getOAuthUrl(@Request() req: any) {
    try {
      const userId = req.user.userId;
      const authUrl = this.driveAccountsService.getAuthUrl(userId);
      return { authUrl };
    } catch (error) {
      console.error('Error generating OAuth URL:', error);
      throw new Error('Failed to generate OAuth URL');
    }
  }

  @Get('oauth/callback')
  async handleOAuthCallback(
    @Query('code') code: string,
    @Query('state') state: string,
    @Res() res: Response,
  ) {
    try {
      await this.driveAccountsService.handleOAuthCallback(code, state);
      // Redirect to frontend success page
      const frontendUrl = process.env.FRONTEND_URL;
      res.redirect(`${frontendUrl}/accounts?success=true`);
    } catch (error) {
      console.error('OAuth callback error:', error);
      const frontendUrl = process.env.FRONTEND_URL;
      res.redirect(`${frontendUrl}/accounts?error=true`);
    }
  }

  @Get()
  @UseGuards(AuthGuard('jwt'))
  async findAll(@Request() req: any) {
    try {
      const userId = req.user.userId;
      const driveAccounts: DriveAccount[] = await this.driveAccountsService.findAllByUserId(userId);
      return {
        success: true,
        message: 'Drive accounts fetched successfully',
        data: driveAccounts,
      };
    } catch (error) {
      console.error('Error fetching drive accounts:', error);
      throw new Error('Failed to fetch drive accounts');
    }
  }

  @Get(':id')
  @UseGuards(AuthGuard('jwt'))
  async findOne(@Param('id') id: string, @Request() req: any) {
    try {
      const userId = req.user.userId;
      const driveAccount: DriveAccount = await this.driveAccountsService.findOne(id, userId);
      return {
        success: true,
        message: 'Drive account fetched successfully',
        data: driveAccount,
      };
    } catch (error) {
      console.error('Error fetching drive account:', error);
      throw new Error('Failed to fetch drive account');
    }
  }

  @Post(':id/refresh')
  @UseGuards(AuthGuard('jwt'))
  async refreshQuota(@Param('id') id: string, @Request() req: any) {
    try {
      const userId = req.user.userId;
      const refreshedAccount: DriveAccount = await this.driveAccountsService.refreshQuota(id, userId);
      return {
        success: true,
        message: 'Drive account quota refreshed successfully',
        data: refreshedAccount,
      };
    }catch (error) {
      console.error('Error refreshing drive account quota:', error);
      throw new Error('Failed to refresh drive account quota');
    }
  }

  @Delete(':id')
  @UseGuards(AuthGuard('jwt'))
  async remove(@Param('id') id: string, @Request() req: any) {
    try {
      const userId = req.user.userId;
      await this.driveAccountsService.remove(id, userId);
      return {
        success: true,
        message: 'Drive account removed successfully',
      };
    } catch (error) {
      console.error('Error removing drive account:', error);
      throw new Error('Failed to remove drive account');
    }
  }
}
