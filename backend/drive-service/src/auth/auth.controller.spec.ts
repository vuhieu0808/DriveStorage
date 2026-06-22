import { Test, TestingModule } from '@nestjs/testing';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { UnauthorizedException } from '@nestjs/common';
import { Request, Response } from 'express';
import { LoginDto } from './dto/login.dto';

describe('AuthController', () => {
  let controller: AuthController;
  let service: jest.Mocked<AuthService>;

  const mockAuthService = () => ({
    register: jest.fn(),
    login: jest.fn(),
    refresh: jest.fn(),
    logout: jest.fn(),
  });

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [{ provide: AuthService, useFactory: mockAuthService }],
    }).compile();

    controller = module.get<AuthController>(AuthController);
    service = module.get<AuthService>(AuthService) as jest.Mocked<AuthService>;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('register', () => {
    it('should register a new user', async () => {
      const dto: RegisterDto = {
        userName: 'testuser',
        email: 'testuser@example.com',
        password: 'password',
      };

      service.register.mockResolvedValue({
        id: '1',
        userName: dto.userName,
        email: dto.email,
      });

      const result = await controller.register(dto);

      expect(result).toEqual({
        success: true,
        message: 'Registration successful',
      });
      expect(service.register).toHaveBeenCalledWith(
        dto.userName,
        dto.email,
        dto.password,
      );
    });

    it('should handle registration errors', async () => {
      const dto: RegisterDto = {
        userName: 'testuser',
        email: 'testuser@example.com',
        password: 'password',
      };

      service.register.mockRejectedValue(new Error('Registration failed'));

      await expect(controller.register(dto)).rejects.toThrow(
        new UnauthorizedException('Registration failed'),
      );

      expect(service.register).toHaveBeenCalledWith(
        dto.userName,
        dto.email,
        dto.password,
      );
    });
  });

  describe('login', () => {
    const mockResponse = {
      cookie: jest.fn(),
    } as unknown as Response;

    it('should login successfully and set refresh token cookie', async () => {
      const dto: LoginDto = {
        email: 'testuser@example.com',
        password: 'password',
      };

      service.login.mockResolvedValue({
        accessToken: 'mock_access_token',
        refreshToken: 'mock_refresh_token',
      });

      const result = await controller.login(dto, mockResponse);

      expect(result).toEqual({
        success: true,
        message: 'Login successful',
        data: { accessToken: 'mock_access_token' },
      });
      expect(service.login).toHaveBeenCalledWith(dto.email, dto.password);
      expect(mockResponse.cookie).toHaveBeenCalledWith(
        'refreshToken',
        'mock_refresh_token',
        expect.any(Object),
      );
    });

    it('should handle login errors', async () => {
      const dto: LoginDto = {
        email: 'testuser@example.com',
        password: 'password',
      };

      service.login.mockRejectedValue(new Error('Login failed'));

      await expect(controller.login(dto, mockResponse)).rejects.toThrow(
        new UnauthorizedException('Login failed'),
      );
      expect(mockResponse.cookie).not.toHaveBeenCalled();
    });
  });

  describe('refresh', () => {
    it('should refresh the access token', async () => {
      const mockRequest = {
        cookies: {
          refreshToken: 'mock_refresh_token',
        },
      } as unknown as Request;

      service.refresh.mockResolvedValue({
        accessToken: 'mock_access_token',
      });

      const result = await controller.refresh(mockRequest);

      expect(service.refresh).toHaveBeenCalledWith('mock_refresh_token');
      expect(result).toEqual({
        success: true,
        message: 'Token refreshed',
        data: { accessToken: 'mock_access_token' },
      });
    });

    it('should handle refresh errors', async () => {
      const mockRequest = {
        cookies: {
          refreshToken: 'mock_refresh_token',
        },
      } as unknown as Request;

      service.refresh.mockRejectedValue(new Error('Invalid refresh token'));

      await expect(controller.refresh(mockRequest)).rejects.toThrow(
        new UnauthorizedException('Invalid refresh token'),
      );

      expect(service.refresh).toHaveBeenCalledWith('mock_refresh_token');
    });

    it('should handle missing refresh token', async () => {
      const mockRequest = {
        cookies: {}, // no cookies - refresh token missing
      } as unknown as Request;

      service.refresh.mockRejectedValue(new Error('No token provided'));

      await expect(controller.refresh(mockRequest)).rejects.toThrow(
        new UnauthorizedException('Invalid refresh token'),
      );

      expect(service.refresh).toHaveBeenCalledWith(undefined);
    });
  });

  describe('logout', () => {
    const mockRequest = {
      cookies: {
        refreshToken: 'mock_refresh_token',
      },
    } as unknown as Request;
    const mockResponse = {
      clearCookie: jest.fn(),
    } as unknown as Response;

    it('should logout successfully and clear refresh token cookie', async () => {
      const result = await controller.logout(mockRequest, mockResponse);
      expect(service.logout).toHaveBeenCalledWith('mock_refresh_token');
      expect(mockResponse.clearCookie).toHaveBeenCalledWith('refreshToken');
      expect(result).toEqual({
        success: true,
        message: 'Logout successful',
      });
    });

    it('should handle logout errors', async () => {
      service.logout.mockRejectedValue(new Error('Logout failed'));
      await expect(
        controller.logout(mockRequest, mockResponse),
      ).rejects.toThrow(new UnauthorizedException('Logout failed'));
      expect(service.logout).toHaveBeenCalledWith('mock_refresh_token');
      expect(mockResponse.clearCookie).not.toHaveBeenCalled();
    });
  });
});
