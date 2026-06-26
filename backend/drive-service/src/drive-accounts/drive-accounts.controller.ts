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
  findAll(@Request() req: any) {
    const userId = req.user.userId;
    return this.driveAccountsService.findAllByUserId(userId);
  }

  @Get(':id')
  @UseGuards(AuthGuard('jwt'))
  findOne(@Param('id') id: string, @Request() req: any) {
    const userId = req.user.userId;
    return this.driveAccountsService.findOne(id, userId);
  }

  @Post(':id/refresh')
  @UseGuards(AuthGuard('jwt'))
  refreshQuota(@Param('id') id: string, @Request() req: any) {
    const userId = req.user.userId;
    return this.driveAccountsService.refreshQuota(id, userId);
  }

  @Delete(':id')
  @UseGuards(AuthGuard('jwt'))
  remove(@Param('id') id: string, @Request() req: any) {
    const userId = req.user.userId;
    return this.driveAccountsService.remove(id, userId);
  }
}
