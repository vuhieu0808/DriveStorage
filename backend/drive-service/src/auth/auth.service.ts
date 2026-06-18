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
      if (existing) throw new UnauthorizedException('Email already in use');
      const hashedPassword = await bcrypt.hash(password, 10);
      const user = await this.usersService.create({
        userName,
        email,
        hashedPassword,
      });
      return { id: user.id, userName: user.userName, email: user.email };
    } catch (error) {
      console.error('Error during registration:', error);
      throw new UnauthorizedException('Registration failed');
    }
  }

  async login(email: string, password: string) {
    const user = await this.usersService.findByEmail(email);
    if (!user) throw new UnauthorizedException('Invalid credentials');
    const matched = await bcrypt.compare(password, user.hashedPassword);
    if (!matched) throw new UnauthorizedException('Invalid credentials');

    const payload = { sub: user.id };
    const accessToken = await this.jwtService.signAsync(
      payload,
      this.getJwtSignOptions(),
    );

    const refreshToken = randomBytes(64).toString('hex');
    const refreshTtl = this.getRefreshTtlSeconds();
    const expiredAt = new Date(Date.now() + refreshTtl * 1000);

    await this.sessionsService.createSession({
      userId: user.id,
      refreshToken,
      expiredAt,
    });

    return { accessToken, refreshToken };
  }

  async refresh(refreshToken: string) {
    if (!refreshToken) {
      throw new UnauthorizedException('Missing refresh token');
    }

    const session = await this.sessionsService.findByToken(refreshToken);
    if (!session) throw new UnauthorizedException('Invalid refresh token');
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
  }

  async logout(refreshToken: string) {
    if (!refreshToken) {
      return;
    }
    await this.sessionsService.deleteByToken(refreshToken);
  }
}
