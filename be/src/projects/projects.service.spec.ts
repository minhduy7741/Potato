import { Test, TestingModule } from '@nestjs/testing';
import { ProjectsService } from './projects.service';
import { PrismaService } from '../prisma/prisma.service';
import { DockerService } from '../docker/docker.service';
import { NginxService } from '../infrastructure/nginx.service';
import { SslService } from '../infrastructure/ssl.service';
import { DatabasesService } from '../databases/databases.service';

describe('ProjectsService', () => {
  let service: ProjectsService;
  let dockerService: DockerService;
  let nginxService: NginxService;
  let prismaService: PrismaService;

  beforeEach(async () => {
    // Mock the dependencies
    const mockPrisma = {
      project: {
        findMany: jest.fn().mockResolvedValue([]),
        findUnique: jest.fn().mockResolvedValue({ id: 1 }),
        delete: jest.fn(),
        update: jest.fn(),
      },
      deploymentLog: {
        create: jest.fn().mockResolvedValue({ id: 1 }),
        update: jest.fn().mockResolvedValue({}),
      },
      databaseInstance: {
        findMany: jest.fn().mockResolvedValue([]),
      },
    };

    const mockDocker = {
      getUsedHostPorts: jest.fn().mockResolvedValue(new Set([10000, 10001])),
      stopContainer: jest.fn().mockResolvedValue(true),
      removeContainer: jest.fn().mockResolvedValue(true),
      removeImage: jest.fn().mockResolvedValue(true),
      listContainers: jest.fn().mockResolvedValue([]),
    };

    const mockNginx = {
      removeProxyConfig: jest.fn(),
      generateProxyConfig: jest.fn(),
    };

    const mockSsl = {
      // Add methods if needed
    };

    const mockDatabases = {
      // Add methods if needed
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProjectsService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: DockerService, useValue: mockDocker },
        { provide: NginxService, useValue: mockNginx },
        { provide: SslService, useValue: mockSsl },
        { provide: DatabasesService, useValue: mockDatabases },
      ],
    }).compile();

    service = module.get<ProjectsService>(ProjectsService);
    dockerService = module.get<DockerService>(DockerService);
    nginxService = module.get<NginxService>(NginxService);
    prismaService = module.get<PrismaService>(PrismaService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('allocatePort', () => {
    it('should allocate a port not used by docker or db', async () => {
      // @ts-ignore
      const port = await service.allocatePort();
      expect(port).toBeGreaterThanOrEqual(10000);
      expect(port).toBeLessThanOrEqual(20000);
      expect(port).not.toBe(10000);
      expect(port).not.toBe(10001);
    });
  });

  describe('removeProject', () => {
    it('should properly clean up docker container, image, and nginx config', async () => {
      const mockProject = {
        id: 1,
        containerId: 'test-container-id',
        subdomain: 'test-subdomain',
      };
      
      // @ts-ignore
      jest.spyOn(service as any, 'findProjectOrFail').mockResolvedValue(mockProject);

      await service.deleteProject(1);

      // Verify docker cleanup (should await stop then remove)
      expect(dockerService.stopContainer).toHaveBeenCalledWith('test-container-id');
      expect(dockerService.removeContainer).toHaveBeenCalledWith('test-container-id');
      expect(dockerService.removeImage).toHaveBeenCalledWith('potato-app-1:latest');

      // Verify nginx cleanup
      expect(nginxService.removeProxyConfig).toHaveBeenCalledWith('test-subdomain');

      // Verify DB cleanup
      expect(prismaService.project.delete).toHaveBeenCalledWith({ where: { id: 1 } });
    });
  });

  describe('runGitDeployBackground', () => {
    it('should throw an error if host is out of memory', async () => {
      const os = require('os');
      jest.spyOn(os, 'freemem').mockReturnValue(100 * 1024 * 1024); // 100MB free
      jest.spyOn(os, 'totalmem').mockReturnValue(8000 * 1024 * 1024); // 8GB total
      
      const mockProject = {
        id: 1,
        ramLimit: 512, // Needs 512MB
      };
      
      await expect((service as any).runGitDeployBackground(mockProject, 1, 'repo', 'main')).rejects.toThrow('không đủ tài nguyên');
    });
  });
});
