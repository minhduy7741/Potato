import { Test, TestingModule } from '@nestjs/testing';
import { DatabasesService } from './databases.service';
import { PrismaService } from '../prisma/prisma.service';
import { DockerService } from '../docker/docker.service';

describe('DatabasesService', () => {
  let service: DatabasesService;
  let prismaService: PrismaService;
  let dockerService: DockerService;

  beforeEach(async () => {
    const mockPrisma = {
      databaseInstance: {
        findMany: jest.fn().mockResolvedValue([]),
        create: jest.fn(),
        update: jest.fn(),
        findUnique: jest.fn(),
        count: jest.fn().mockResolvedValue(0),
      },
      project: {
        findUnique: jest.fn().mockResolvedValue({ id: 1, userId: 1 }),
      },
      user: {
        findUnique: jest.fn().mockResolvedValue({ id: 1, maxDatabases: 5 }),
      }
    };

    const mockDocker = {
      getUsedHostPorts: jest.fn().mockResolvedValue(new Set([3306, 5432])),
      createContainer: jest.fn().mockResolvedValue({ id: 'mock-db-container' }),
      startContainer: jest.fn().mockResolvedValue(true),
      stopContainer: jest.fn().mockResolvedValue(true),
      removeContainer: jest.fn().mockResolvedValue(true),
      pullImage: jest.fn().mockResolvedValue(true),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DatabasesService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: DockerService, useValue: mockDocker },
      ],
    }).compile();

    service = module.get<DatabasesService>(DatabasesService);
    prismaService = module.get<PrismaService>(PrismaService);
    dockerService = module.get<DockerService>(DockerService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('allocateDbPort', () => {
    it('should allocate a port not used by docker or DB', async () => {
      // @ts-ignore
      const port = await service.allocatePort();
      expect(port).toBeGreaterThanOrEqual(20000);
      expect(port).toBeLessThanOrEqual(30000);
      expect(port).not.toBe(3306);
      expect(port).not.toBe(5432);
    });
  });

  describe('create', () => {
    it('should create a database record and start a container', async () => {
      // @ts-ignore
      prismaService.databaseInstance.create.mockResolvedValue({ id: 1, name: 'mydb', port: 10005, type: 'postgres' });
      // @ts-ignore
      jest.spyOn(service as any, 'allocatePort').mockResolvedValue(10005);

      const dto = { name: 'mydb', type: 'postgres' as any, rootPassword: 'password', projectId: 1 };
      const result = await service.create(dto);

      expect(dockerService.createContainer).toHaveBeenCalled();
      expect(prismaService.databaseInstance.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 1 },
          data: { containerId: 'mock-db-container', status: 'running' },
        })
      );
      expect(result).toHaveProperty('id', 1);
    });
  });
});
