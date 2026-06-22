import {
  Controller,
  Post,
  Body,
  Res,
  Req,
  HttpCode,
  UnauthorizedException,
} from '@nestjs/common';
import type { Response, Request } from 'express';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  async register(@Body() body: RegisterDto) {
    try {
      await this.authService.register(body.userName, body.email, body.password);
      return {
        success: true,
        message: 'Registration successful',
      };
    } catch (error) {
      console.error('Error during registration:', error);
      if (error instanceof UnauthorizedException) {
        throw error;
      }
      throw new UnauthorizedException('Registration failed');
    }
  }

  @HttpCode(200)
  @Post('login')
  async login(
    @Body() body: LoginDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    try {
      const { accessToken, refreshToken } = await this.authService.login(
        body.email,
        body.password,
      );
      const isProd = process.env.NODE_ENV === 'production';
      res.cookie('refreshToken', refreshToken, {
        httpOnly: true,
        secure: isProd,
        sameSite: 'lax',
        maxAge:
          parseInt(
            process.env.JWT_REFRESH_EXPIRES || `${60 * 60 * 24 * 7}`,
            10,
          ) * 1000,
      });
      return {
        success: true,
        message: 'Login successful',
        data: { accessToken },
      };
    } catch (error) {
      console.error('Error during login:', error);
      if (error instanceof UnauthorizedException) {
        throw error;
      }
      throw new UnauthorizedException('Login failed');
    }
  }

  @HttpCode(200)
  @Post('refresh')
  async refresh(@Req() req: Request) {
    try {
      const refreshToken = req.cookies?.refreshToken;
      const { accessToken } = await this.authService.refresh(refreshToken);
      return {
        success: true,
        message: 'Token refreshed',
        data: { accessToken },
      };
    } catch (error) {
      console.error('Error during token refresh:', error);
      if (error instanceof UnauthorizedException) {
        throw error;
      }
      throw new UnauthorizedException('Invalid refresh token');
    }
  }

  @HttpCode(200)
  @Post('logout')
  async logout(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    try {
      const refreshToken = req.cookies?.refreshToken;
      await this.authService.logout(refreshToken);
      res.clearCookie('refreshToken');
      return {
        success: true,
        message: 'Logout successful',
      };
    } catch (error) {
      console.error('Error during logout:', error);
      if (error instanceof UnauthorizedException) {
        throw error;
      }
      throw new UnauthorizedException('Logout failed');
    }
  }
}
