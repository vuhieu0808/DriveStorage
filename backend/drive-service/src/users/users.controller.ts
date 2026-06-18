import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Req,
  Put,
  BadRequestException,
} from '@nestjs/common';
import { UsersService } from './users.service';
import { AuthGuard } from '@nestjs/passport';
import type { Request } from 'express';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import * as bcrypt from 'bcrypt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { DriveAccount } from '../drive-accounts/entities/drive-account.entity';
import { SessionsService } from '../sessions/sessions.service';

@Controller('users')
export class UsersController {
  constructor(
    private readonly usersService: UsersService,
    @InjectRepository(DriveAccount)
    private readonly driveAccountRepo: Repository<DriveAccount>,
    private readonly sessionsService: SessionsService,
  ) {}

  @UseGuards(AuthGuard('jwt'))
  @Get('profile')
  async getProfile(@Req() req: Request) {
    try {
      const userId = (req as any).user?.userId;
      const user = await this.usersService.findOneById(userId);
      return {
        success: true,
        message: 'Profile retrieved',
        data: { userName: user.userName, email: user.email },
      };
    } catch (error) {
      console.error('Error retrieving profile:', error);
      throw new BadRequestException('User not found');
    }
  }

  @UseGuards(AuthGuard('jwt'))
  @Put('profile')
  async updateProfile(@Req() req: Request, @Body() body: UpdateProfileDto) {
    const userId = (req as any).user?.userId;
    if (!body.userName) throw new BadRequestException('userName required');
    return this.usersService.updateUserName(userId, body.userName);
  }

  @UseGuards(AuthGuard('jwt'))
  @Put('change-password')
  async changePassword(@Req() req: Request, @Body() body: ChangePasswordDto) {
    try {
      const userId = (req as any).user?.userId;
      const user = await this.usersService.findOneById(userId);
      const matched = await bcrypt.compare(
        body.oldPassword,
        user.hashedPassword,
      );
      if (!matched) throw new BadRequestException('oldPassword does not match');
      const hashed = await bcrypt.hash(body.newPassword, 10);
      await this.usersService.updatePassword(userId, hashed);
      // Revoke all refresh sessions for this user
      await this.sessionsService.deleteOtherSessions(userId);
      return { success: true, message: 'Password changed successfully' };
    } catch (error) {
      console.error('Error changing password:', error);
      throw new BadRequestException('Failed to change password');
    }
  }

  @UseGuards(AuthGuard('jwt'))
  @Get('storage-summary')
  async storageSummary(@Req() req: Request) {
    try {
      const userId = (req as any).user?.userId;
      const qb = this.driveAccountRepo
        .createQueryBuilder('da')
        .select([
          'COALESCE(SUM(da.totalSpace),0) as totalSpace',
          'COALESCE(SUM(da.usedSpace),0) as usedSpace',
        ])
        .where('da.userId = :userId', { userId });
      const raw = await qb.getRawOne();
      return {
        success: true,
        message: 'Storage summary retrieved',
        data: {
          totalSpace: Number(raw.totalSpace),
          usedSpace: Number(raw.usedSpace),
        },
      };
    } catch (error) {
      console.error('Error retrieving storage summary:', error);
      throw new BadRequestException('Failed to retrieve storage summary');
    }
  }

  @UseGuards(AuthGuard('jwt'))
  @Get('sessions')
  async listSessions(@Req() req: Request) {
    const userId = (req as any).user?.userId;
    return this.sessionsService.findByUser(userId);
  }

  @UseGuards(AuthGuard('jwt'))
  @Delete('sessions/:id')
  async deleteSession(@Req() req: Request, @Param('id') id: string) {
    const userId = (req as any).user?.userId;
    const sessions = await this.sessionsService.findByUser(userId);
    const target = sessions.find((s) => s.id === id);
    if (!target) throw new BadRequestException('Session not found');
    await this.sessionsService.deleteById(id);
    return { ok: true };
  }
}
