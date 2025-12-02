import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from './auth.service';
import { JwtService } from '@nestjs/jwt';
import { UserEntity } from './user.entity';
import { getRepositoryToken } from '@nestjs/typeorm';
import {
  UnauthorizedException,
  ConflictException,
  Logger,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';

jest.mock('bcrypt');

describe('AuthService', () => {
  let service: AuthService;

  const mockUserRepository = {
    findOne: jest.fn(),
    save: jest.fn(),
  };

  const mockJwtService = {
    sign: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: getRepositoryToken(UserEntity),
          useValue: mockUserRepository,
        },
        {
          provide: JwtService,
          useValue: mockJwtService,
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('validateUser', () => {
    it('should return user when credentials are valid', async () => {
      const user = {
        id: 1,
        username: 'admin',
        password: 'hashedPassword',
      };

      mockUserRepository.findOne.mockResolvedValue(user);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);

      const result = await service.validateUser('admin', 'admin123');

      expect(result).toEqual(user);
      expect(mockUserRepository.findOne).toHaveBeenCalledWith({
        where: { username: 'admin' },
      });
      expect(bcrypt.compare).toHaveBeenCalledWith('admin123', 'hashedPassword');
    });

    it('should throw UnauthorizedException when user not found', async () => {
      mockUserRepository.findOne.mockResolvedValue(null);

      await expect(
        service.validateUser('nonexistent', 'password'),
      ).rejects.toThrow(UnauthorizedException);
      await expect(
        service.validateUser('nonexistent', 'password'),
      ).rejects.toThrow('Invalid credentials');
    });

    it('should throw UnauthorizedException when password is invalid', async () => {
      const user = {
        id: 1,
        username: 'admin',
        password: 'hashedPassword',
      };

      mockUserRepository.findOne.mockResolvedValue(user);
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);

      await expect(
        service.validateUser('admin', 'wrongpassword'),
      ).rejects.toThrow(UnauthorizedException);
      await expect(
        service.validateUser('admin', 'wrongpassword'),
      ).rejects.toThrow('Invalid credentials');
    });
  });

  describe('login', () => {
    it('should return access token when login is successful', async () => {
      const user = {
        id: 1,
        username: 'admin',
        password: 'hashedPassword',
      };

      const token = 'jwt-token-12345';

      mockUserRepository.findOne.mockResolvedValue(user);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);
      mockJwtService.sign.mockReturnValue(token);

      const result = await service.login({
        username: 'admin',
        password: 'admin123',
      });

      expect(result).toEqual({
        access_token: token,
        token_type: 'Bearer',
        expires_in: '24h',
      });

      expect(mockJwtService.sign).toHaveBeenCalledWith({
        sub: user.id,
        username: user.username,
      });
    });

    it('should throw UnauthorizedException when credentials are invalid', async () => {
      mockUserRepository.findOne.mockResolvedValue(null);

      await expect(
        service.login({ username: 'admin', password: 'wrong' }),
      ).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('seedDefaultUser', () => {
    it('should create default user if not exists', async () => {
      mockUserRepository.findOne.mockResolvedValue(null);
      (bcrypt.hash as jest.Mock).mockResolvedValue('hashedPassword');
      mockUserRepository.save.mockResolvedValue({
        id: 1,
        username: 'admin',
        password: 'hashedPassword',
      });

      await service.onModuleInit();

      expect(mockUserRepository.findOne).toHaveBeenCalledWith({
        where: { username: 'admin' },
      });
      expect(bcrypt.hash).toHaveBeenCalledWith('admin123', 10);
      expect(mockUserRepository.save).toHaveBeenCalledWith({
        username: 'admin',
        password: 'hashedPassword',
      });
    });

    it('should not create user if already exists', async () => {
      const existingUser = {
        id: 1,
        username: 'admin',
        password: 'hashedPassword',
      };
      mockUserRepository.findOne.mockResolvedValue(existingUser);

      await service.onModuleInit();

      expect(mockUserRepository.findOne).toHaveBeenCalled();
      expect(mockUserRepository.save).not.toHaveBeenCalled();
    });

    it('should handle errors gracefully', async () => {
      const loggerErrorSpy = jest
        .spyOn(Logger.prototype, 'error')
        .mockImplementation();
      mockUserRepository.findOne.mockRejectedValue(new Error('Database error'));

      await expect(service.onModuleInit()).resolves.not.toThrow();

      loggerErrorSpy.mockRestore();
    });
  });

  describe('register', () => {
    it('should successfully register a new user', async () => {
      const registerDto = {
        username: 'newuser',
        password: 'password123',
      };

      const hashedPassword = 'hashedPassword123';
      const savedUser = {
        id: 2,
        username: 'newuser',
        password: hashedPassword,
      };

      const token = 'jwt-token-new-user';

      mockUserRepository.findOne.mockResolvedValue(null);
      (bcrypt.hash as jest.Mock).mockResolvedValue(hashedPassword);
      mockUserRepository.save.mockResolvedValue(savedUser);
      mockJwtService.sign.mockReturnValue(token);

      const result = await service.register(registerDto);

      expect(result).toEqual({
        access_token: token,
        token_type: 'Bearer',
        expires_in: '24h',
        user: {
          id: savedUser.id,
          username: savedUser.username,
        },
      });

      expect(mockUserRepository.findOne).toHaveBeenCalledWith({
        where: { username: registerDto.username },
      });
      expect(bcrypt.hash).toHaveBeenCalledWith(registerDto.password, 10);
      expect(mockUserRepository.save).toHaveBeenCalledWith({
        username: registerDto.username,
        password: hashedPassword,
      });
      expect(mockJwtService.sign).toHaveBeenCalledWith({
        sub: savedUser.id,
        username: savedUser.username,
      });
    });

    it('should throw ConflictException when username already exists', async () => {
      const registerDto = {
        username: 'admin',
        password: 'password123',
      };

      const existingUser = {
        id: 1,
        username: 'admin',
        password: 'hashedPassword',
      };

      mockUserRepository.findOne.mockResolvedValue(existingUser);

      await expect(service.register(registerDto)).rejects.toThrow(
        ConflictException,
      );
      await expect(service.register(registerDto)).rejects.toThrow(
        'Username already exists',
      );

      expect(mockUserRepository.save).not.toHaveBeenCalled();
    });
  });
});
