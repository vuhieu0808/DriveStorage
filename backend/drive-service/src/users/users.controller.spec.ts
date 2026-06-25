import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { Request } from 'express';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';
import { SessionsService } from '../sessions/sessions.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { User } from './entities/user.entity';
import * as bcrypt from 'bcrypt';

jest.mock('bcrypt');

describe('UsersController', () => {
  let controller: UsersController;
  let service: jest.Mocked<UsersService>;
  let sessionsService: jest.Mocked<SessionsService>;

  const mockQueryBuilder = {
    select: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    getRawOne: jest.fn(),
  };

  const mockDriveAccountRepo = {
    createQueryBuilder: jest.fn().mockReturnValue(mockQueryBuilder),
  };

  const mockUserService = () => ({
    findOneById: jest.fn(),
    updateUserName: jest.fn(),
    updatePassword: jest.fn(),
  });

  const mockSessionsService = () => ({
    deleteOtherSessions: jest.fn(),
  });

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [UsersController],
      providers: [
        { provide: UsersService, useFactory: mockUserService },
        { provide: SessionsService, useFactory: mockSessionsService },
        {
          // Giả định repo được inject tên là 'DriveAccountRepository' hoặc qua Entity
          // Nếu bạn dùng @InjectRepository(DriveAccount), hãy thay chuỗi dưới bằng getRepositoryToken(DriveAccount)
          provide: 'DriveAccountRepository',
          useValue: mockDriveAccountRepo,
        },
      ],
    }).compile();

    controller = module.get<UsersController>(UsersController);
    service = module.get<UsersService>(
      UsersService,
    ) as jest.Mocked<UsersService>;
    sessionsService = module.get<SessionsService>(
      SessionsService,
    ) as jest.Mocked<SessionsService>;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getProfile', () => {
    it('should return user profile', async () => {
      const mockUserId = '1';
      const mockUser: User = {
        id: mockUserId,
        userName: 'testuser',
        email: 'testuser@example.com',
        hashedPassword: 'mockHashedPassword',
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      const mockRequest = {
        user: { userId: mockUserId },
      } as unknown as Request;

      service.findOneById.mockResolvedValue(mockUser);
      const result = await controller.getProfile(mockRequest);

      expect(service.findOneById).toHaveBeenCalledWith(mockUserId);
      expect(result).toEqual({
        success: true,
        message: 'Profile retrieved',
        data: { userName: 'testuser', email: 'testuser@example.com' },
      });
    });

    it('should throw BadRequestException if user is not found/error occurs', async () => {
      const mockRequest = { user: { userId: 'invalid' } } as unknown as Request;
      service.findOneById.mockRejectedValue(new Error('DB Error'));

      await expect(controller.getProfile(mockRequest)).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('updateProfile', () => {
    it('should update user profile successfully', async () => {
      const mockRequest = { user: { userId: '1' } } as unknown as Request;
      const mockBody = { userName: 'newNewName' };
      const mockResponse: User = {
        id: '1',
        userName: 'newNewName',
        email: 'testuser@example.com',
        hashedPassword: 'mockHashedPassword',
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      const expectedOutput = {
        success: true,
        message: 'Profile updated successfully',
        data: mockResponse,
      }

      service.updateUserName.mockResolvedValue(mockResponse);

      const result = await controller.updateProfile(mockRequest, mockBody);

      expect(service.updateUserName).toHaveBeenCalledWith('1', 'newNewName');
      expect(result).toEqual(expectedOutput);
    });

    it('should throw BadRequestException if userName is missing', async () => {
      const mockRequest = { user: { userId: '1' } } as unknown as Request;
      const mockBody = { userName: '' }; // Thiếu userName

      await expect(
        controller.updateProfile(mockRequest, mockBody),
      ).rejects.toThrow(new BadRequestException('Failed to update profile'));
    });
  });

  describe('changePassword', () => {
    it('should change user password and revoke other sessions', async () => {
      const mockRequest = { user: { userId: '1' } } as unknown as Request;
      const mockBody = {
        oldPassword: 'old-password',
        newPassword: 'new-password',
      };
      const mockUser = {
        id: '1',
        hashedPassword: 'hashed-old-password',
      } as User;

      service.findOneById.mockResolvedValue(mockUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);
      (bcrypt.hash as jest.Mock).mockResolvedValue('new-hashed-password');
      service.updatePassword.mockResolvedValue(undefined);
      sessionsService.deleteOtherSessions.mockResolvedValue(undefined);

      const result = await controller.changePassword(mockRequest, mockBody);

      expect(service.findOneById).toHaveBeenCalledWith('1');
      expect(bcrypt.compare).toHaveBeenCalledWith(
        'old-password',
        'hashed-old-password',
      );
      expect(bcrypt.hash).toHaveBeenCalledWith('new-password', 10);
      expect(service.updatePassword).toHaveBeenCalledWith(
        '1',
        'new-hashed-password',
      );
      expect(sessionsService.deleteOtherSessions).toHaveBeenCalledWith('1');
      expect(result).toEqual({
        success: true,
        message: 'Password changed successfully',
      });
    });

    it('should throw BadRequestException if old password does not match', async () => {
      const mockRequest = { user: { userId: '1' } } as unknown as Request;
      const mockBody = {
        oldPassword: 'wrong-password',
        newPassword: 'new-password',
      };
      const mockUser = {
        id: '1',
        hashedPassword: 'hashed-old-password',
      } as User;

      service.findOneById.mockResolvedValue(mockUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(false); // Sai mật khẩu

      await expect(
        controller.changePassword(mockRequest, mockBody),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('storageSummary', () => {
    it('should return storage summary with formatted numbers', async () => {
      const mockRequest = { user: { userId: '1' } } as unknown as Request;
      const mockRawData = { totalSpace: '5000', usedSpace: '2000' };

      // Giả lập luồng chạy của QueryBuilder đại diện cho repo
      mockQueryBuilder.getRawOne.mockResolvedValue(mockRawData);

      const result = await controller.storageSummary(mockRequest);

      expect(mockDriveAccountRepo.createQueryBuilder).toHaveBeenCalledWith(
        'da',
      );
      expect(mockQueryBuilder.select).toHaveBeenCalled();
      expect(mockQueryBuilder.where).toHaveBeenCalledWith(
        'da.userId = :userId',
        { userId: '1' },
      );
      expect(result).toEqual({
        success: true,
        message: 'Storage summary retrieved',
        data: {
          totalSpace: 5000, // Đã được ép kiểu Number() đúng như controller xử lý
          usedSpace: 2000,
        },
      });
    });

    it('should throw BadRequestException if database query fails', async () => {
      const mockRequest = { user: { userId: '1' } } as unknown as Request;
      mockQueryBuilder.getRawOne.mockRejectedValue(new Error('Query failed'));

      await expect(controller.storageSummary(mockRequest)).rejects.toThrow(
        new BadRequestException('Failed to retrieve storage summary'),
      );
    });
  });
});
