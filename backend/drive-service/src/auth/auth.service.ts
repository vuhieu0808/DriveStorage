import { Injectable, UnauthorizedException } from '@nestjs/common';
import type { JwtSignOptions } from '@nestjs/jwt';
import { JwtService } from '@nestjs/jwt';
import { UsersService } from '../users/users.service';
import { SessionsService } from '../sessions/sessions.service';
import * as bcrypt from 'bcrypt';
import { randomBytes } from 'crypto';

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly sessionsService: SessionsService,
    private readonly jwtService: JwtService,
  ) {}

  private getRefreshTtlSeconds(): number {
    return parseInt(
      process.env.JWT_REFRESH_EXPIRES || `${60 * 60 * 24 * 7}`,
      10,
    );
  }

  private getJwtSignOptions(): JwtSignOptions {
    const expiresIn: string = process.env.JWT_ACCESS_EXPIRES || '15m';
    return {
      expiresIn,
    } as JwtSignOptions;
  }

  async register(userName: string, email: string, password: string) {
    try {
      const existing = await this.usersService.findByEmail(email);
      if (existing) throw new UnauthorizedException('Email is already in use');
      const hashedPassword = await bcrypt.hash(password, 10);
      const user = await this.usersService.create({
        userName,
        email,
        hashedPassword,
      });
      return { id: user.id, userName: user.userName, email: user.email };
    } catch (error) {
      console.error('Error during registration:', error);
      if (error instanceof UnauthorizedException) {
        throw error;
      }
      throw new UnauthorizedException('Registration failed');
    }
  }

  async login(email: string, password: string) {
    try {
      const user = await this.usersService.findByEmail(email);
      if (!user) throw new UnauthorizedException('User not found');
      const matched = await bcrypt.compare(password, user.hashedPassword);
      if (!matched) throw new UnauthorizedException('Invalid password');

      const payload = { sub: user.id };
      const accessToken = await this.jwtService.signAsync(
        payload,
        this.getJwtSignOptions(),
      );

      let refreshToken: string;

      const existingSessions = await this.sessionsService.findByUser(user.id);
      if (existingSessions.length > 0) {
        const existingSession = existingSessions[0];
        refreshToken = existingSession.refreshToken;
      }
      else {
        refreshToken = randomBytes(64).toString('hex');
        const refreshTtl = this.getRefreshTtlSeconds();
        const expiredAt = new Date(Date.now() + refreshTtl * 1000);

        await this.sessionsService.createSession({
          userId: user.id,
          refreshToken,
          expiredAt,
        });
      }

      return { accessToken, refreshToken };
    } catch (error) {
      console.error('Error during login:', error);
      if (error instanceof UnauthorizedException) {
        throw error;
      }
      throw new UnauthorizedException('Invalid credentials');
    }
  }

  async refresh(refreshToken: string) {
    try {
      if (!refreshToken) {
        throw new UnauthorizedException('Missing refresh token');
      }

      const session = await this.sessionsService.findByToken(refreshToken);
      if (!session) throw new UnauthorizedException('Session not found');
      if (session.expiredAt.getTime() < Date.now()) {
        await this.sessionsService.deleteByToken(refreshToken);
        throw new UnauthorizedException('Refresh token expired');
      }

      const payload = { sub: session.userId };
      const accessToken = await this.jwtService.signAsync(
        payload,
        this.getJwtSignOptions(),
      );

      return { accessToken };
    } catch (error) {
      console.error('Error during token refresh:', error);
      if (error instanceof UnauthorizedException) {
        throw error;
      }
      throw new UnauthorizedException('Invalid refresh token');
    }
  }

  async logout(refreshToken: string) {
    if (!refreshToken) {
      return;
    }
    await this.sessionsService.deleteByToken(refreshToken);
  }
}
