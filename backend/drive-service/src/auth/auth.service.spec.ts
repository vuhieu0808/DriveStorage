import { Test, TestingModule } from '@nestjs/testing';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { UnauthorizedException } from '@nestjs/common';
import { Request, Response } from 'express';
import { LoginDto } from './dto/login.dto';
import { UsersService } from '../users/users.service';
import { SessionsService } from '../sessions/sessions.service';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';

jest.mock('bcrypt');

describe('AuthService', () => {
  let authService: AuthService;
  let userService: jest.Mocked<UsersService>;
  let sessionsService: jest.Mocked<SessionsService>;
  let jwtService: jest.Mocked<JwtService>;

  beforeEach(async () => {
    const mockUsersService = () => ({
      findByEmail: jest.fn(),
      create: jest.fn(),
    });
    const mockSessionsService = () => ({
      createSession: jest.fn(),
      findByToken: jest.fn(),
      deleteByToken: jest.fn(),
    });
    const mockJwtService = () => ({ signAsync: jest.fn() });

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: UsersService, useFactory: mockUsersService },
        { provide: SessionsService, useFactory: mockSessionsService },
        { provide: JwtService, useFactory: mockJwtService },
      ],
    }).compile();

    authService = module.get<AuthService>(AuthService);
    userService = module.get(UsersService);
    sessionsService = module.get(SessionsService);
    jwtService = module.get(JwtService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('register', () => {
    it('should register a new user', async () => {
      const userName = 'testuser';
      const email = 'test@example.com';
      const password = 'password';

      userService.findByEmail.mockResolvedValue(null);
      (bcrypt.hash as jest.Mock).mockResolvedValue('hashedpassword');
      userService.create.mockResolvedValue({
        id: '1',
        userName,
        email,
        hashedPassword: 'hashedpassword',
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const result = await authService.register(userName, email, password);

      expect(userService.findByEmail).toHaveBeenCalledWith(email);
      expect(bcrypt.hash).toHaveBeenCalledWith(password, 10);
      expect(userService.create).toHaveBeenCalledWith({
        userName,
        email,
        hashedPassword: 'hashedpassword',
      });
      expect(result).toEqual({ id: '1', userName, email });
    });
    it('should throw an error if email is already in use', async () => {
      const userName = 'testuser';
      const email = 'test@example.com';
      const password = 'password';

      userService.findByEmail.mockResolvedValue({
        id: '1',
        userName,
        email,
        hashedPassword: 'hashedpassword',
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      await expect(
        authService.register(userName, email, password),
      ).rejects.toThrow('Email is already in use');
    });
    it('should handle registration errors', async () => {
      const userName = 'testuser';
      const email = 'test@example.com';
      const password = 'password';

      userService.findByEmail.mockResolvedValue(null);
      (bcrypt.hash as jest.Mock).mockResolvedValue('hashedpassword');
      userService.create.mockRejectedValue(new Error('Registration failed'));

      await expect(
        authService.register(userName, email, password),
      ).rejects.toThrow('Registration failed');
    });
  });

  describe('login', () => {
    it('should login successfully and return tokens', async () => {
      const email = 'test@example.com';
      const password = 'password';

      userService.findByEmail.mockResolvedValue({
        id: '1',
        userName: 'testuser',
        email,
        hashedPassword: 'hashedpassword',
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);
      jwtService.signAsync.mockResolvedValue('mock-accessToken');
      sessionsService.createSession.mockResolvedValue({} as any);

      const result = await authService.login(email, password);

      expect(userService.findByEmail).toHaveBeenCalledWith(email);
      expect(bcrypt.compare).toHaveBeenCalledWith(password, 'hashedpassword');
      expect(jwtService.signAsync).toHaveBeenCalled();
      expect(sessionsService.createSession).toHaveBeenCalled();
      expect(result).toHaveProperty('accessToken', 'mock-accessToken');
      expect(result).toHaveProperty('refreshToken');
    });

    it('should throw an error if user is not found', async () => {
      const email = 'test@example.com';
      const password = 'password';

      userService.findByEmail.mockResolvedValue(null);

      await expect(authService.login(email, password)).rejects.toThrow(
        'User not found',
      );
    });

    it('should throw an error if password is incorrect', async () => {
      const email = 'test@example.com';
      const password = 'password';

      userService.findByEmail.mockResolvedValue({
        id: '1',
        userName: 'testuser',
        email,
        hashedPassword: 'hashedpassword',
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);

      await expect(authService.login(email, password)).rejects.toThrow(
        'Invalid password',
      );
    });

    it('should handle login errors', async () => {
      const email = 'test@example.com';
      const password = 'password';

      userService.findByEmail.mockRejectedValue(new Error('Login failed'));

      await expect(authService.login(email, password)).rejects.toThrow(
        'Invalid credentials',
      );
    });
  });

  describe('refresh', () => {
    it('should refresh access token successfully', async () => {
      const refreshToken = 'valid-refresh-token';
      const user = {
        id: '1',
        userName: 'testuser',
        email: 'test@example.com',
        hashedPassword: 'hashedpassword',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      sessionsService.findByToken.mockResolvedValue({
        id: '1',
        userId: '1',
        user,
        refreshToken,
        expiredAt: new Date(Date.now() + 10000),
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      jwtService.signAsync.mockResolvedValue('new-access-token');
      const result = await authService.refresh(refreshToken);
      expect(sessionsService.findByToken).toHaveBeenCalledWith(refreshToken);
      expect(jwtService.signAsync).toHaveBeenCalledWith(
        { sub: user.id },
        expect.anything(),
      );
      expect(result).toEqual({ accessToken: 'new-access-token' });
    });

    it('should throw an error if refresh token is missing', async () => {
      await expect(authService.refresh('')).rejects.toThrow(
        'Missing refresh token',
      );
    });

    it('should throw an error if refresh token is invalid', async () => {
      sessionsService.findByToken.mockResolvedValue(null);
      await expect(authService.refresh('invalid-token')).rejects.toThrow(
        'Session not found',
      );
    });

    it('should throw an error if refresh token is expired', async () => {
      const user = {
        id: '1',
        userName: 'testuser',
        email: 'test@example.com',
        hashedPassword: 'hashedpassword',
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      const expiredSession = {
        id: '1',
        userId: '1',
        user,
        refreshToken: 'expired-token',
        expiredAt: new Date(Date.now() - 10000),
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      sessionsService.findByToken.mockResolvedValue(expiredSession);
      sessionsService.deleteByToken.mockResolvedValue({} as any);
      await expect(authService.refresh('expired-token')).rejects.toThrow(
        'Refresh token expired',
      );
      expect(sessionsService.deleteByToken).toHaveBeenCalledWith(
        'expired-token',
      );
    });
  });

  describe('logout', () => {
    it('should return if refresh token is missing', async () => {
      await expect(authService.logout('')).resolves.toBeUndefined();
    });
    it('should delete session by refresh token', async () => {
      const refreshToken = 'valid-refresh-token';
      sessionsService.deleteByToken.mockResolvedValue({} as any);
      await expect(authService.logout(refreshToken)).resolves.toBeUndefined();
      expect(sessionsService.deleteByToken).toHaveBeenCalledWith(refreshToken);
    });
  });
});
