import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from './auth.service';
import { PrismaService } from '../prisma/prisma.service';
import { JwtService } from '@nestjs/jwt';
import { ProjectsService } from '../projects/projects.service';
import * as bcrypt from 'bcrypt';

jest.mock('bcrypt');

describe('AuthService', () => {
  let service: AuthService;
  let prismaService: PrismaService;
  let jwtService: JwtService;

  beforeEach(async () => {
    const mockPrisma = {
      user: {
        findUnique: jest.fn(),
        create: jest.fn(),
      },
    };

    const mockJwt = {
      sign: jest.fn().mockReturnValue('mock-jwt-token'),
      signAsync: jest.fn().mockResolvedValue('mock-jwt-token'),
    };

    const mockProjects = {
      // Add methods if needed
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: JwtService, useValue: mockJwt },
        { provide: ProjectsService, useValue: mockProjects },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    prismaService = module.get<PrismaService>(PrismaService);
    jwtService = module.get<JwtService>(JwtService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('register', () => {
    it('should successfully register a user and hash password', async () => {
      // @ts-ignore
      prismaService.user.findUnique.mockResolvedValue(null);
      // @ts-ignore
      prismaService.user.create.mockResolvedValue({ id: 1, email: 'test@example.com' });
      (bcrypt.hash as jest.Mock).mockResolvedValue('hashed-password');

      const result = await service.register({ email: 'test@example.com', password: 'password', name: 'Test User' } as any);

      expect(bcrypt.hash).toHaveBeenCalledWith('password', 10);
      expect(prismaService.user.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            email: 'test@example.com',
            password: 'hashed-password',
          }),
        })
      );
      expect(result).toEqual({ accessToken: 'mock-jwt-token', message: 'Đăng ký thành công', user: expect.anything() });
    });

    it('should throw an error if email already exists', async () => {
      // @ts-ignore
      prismaService.user.findUnique.mockResolvedValue({ id: 1 });

      try {
        await service.register({ email: 'test@example.com', password: 'password', name: 'Test User' } as any);
        // eslint-disable-next-line jest/no-jasmine-globals
        fail('Should have thrown an error');
      } catch (err: any) {
        expect(err.message).toBe('Email đã tồn tại trên hệ thống');
      }
    });
  });

  describe('login', () => {
    it('should login successfully and return a jwt token', async () => {
      const mockUser = { id: 1, email: 'test@example.com', password: 'hashed-password' };
      // @ts-ignore
      prismaService.user.findUnique.mockResolvedValue(mockUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);

      const result = await service.login({ email: 'test@example.com', password: 'password' } as any);

      expect(bcrypt.compare).toHaveBeenCalledWith('password', 'hashed-password');
      expect(jwtService.sign).toHaveBeenCalledWith({ sub: mockUser.id, email: mockUser.email, role: undefined });
      expect(result).toHaveProperty('access_token', 'mock-jwt-token');
    });

    it('should throw UnauthorizedException if password does not match', async () => {
      const mockUser = { id: 1, email: 'test@example.com', password: 'hashed-password' };
      // @ts-ignore
      prismaService.user.findUnique.mockResolvedValue(mockUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);

      try {
        await service.login({ email: 'test@example.com', password: 'wrong-password' } as any);
        // eslint-disable-next-line jest/no-jasmine-globals
        fail('Should have thrown an error');
      } catch (err: any) {
        expect(err.message).toBe('Thông tin đăng nhập không chính xác');
      }
    });
  });
});
