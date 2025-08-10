import { Test, TestingModule } from '@nestjs/testing';
import { JobsController } from './jobs.controller';
import { JobsService } from './jobs.service';
import { PaginateQuery, Paginated } from 'nestjs-paginate';
import { JobEntity } from '@/database/entities/job.entity';

// Mock JobsService
const mockJobsService = {
  findAll: jest.fn(),
  load: jest.fn(),
};

describe('JobsController', () => {
  let controller: JobsController;
  let service: JobsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [JobsController],
      providers: [
        {
          provide: JobsService,
          useValue: mockJobsService,
        },
      ],
    }).compile();

    controller = module.get<JobsController>(JobsController);
    service = module.get<JobsService>(JobsService);
  });

  // Clear all mocks after each test
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('findAll', () => {
    it('should call jobsService.findAll with the correct query and return the result', async () => {
      // Arrange
      const query: PaginateQuery = { path: 'jobs-offers', page: 1, limit: 10 };
      const expectedResult: Paginated<JobEntity> = {
        data: [new JobEntity()], // Mock with one or more JobEntity instances
        meta: {
          itemsPerPage: 10,
          totalItems: 1,
          currentPage: 1,
          totalPages: 1,
          sortBy: [],
          searchBy: [],
          search: '',
          select: [],
        },
        links: {
          current: 'jobs-offers?page=1&limit=10',
        },
      };
      const findAllSpy = jest
        .spyOn(service, 'findAll')
        .mockResolvedValue(expectedResult);

      // Act
      const result = await controller.findAll(query);

      // Assert
      expect(findAllSpy).toHaveBeenCalledWith(query);
      expect(result).toEqual(expectedResult);
    });

    it('should handle errors from jobsService.findAll gracefully', async () => {
      // Arrange
      const query: PaginateQuery = { path: 'jobs-offers' };
      const error = new Error('Database connection failed');
      jest.spyOn(service, 'findAll').mockRejectedValue(error);

      // Act & Assert
      await expect(controller.findAll(query)).rejects.toThrow(error);
    });
  });

  describe('load', () => {
    it('should call jobsService.load and return the array of created jobs', async () => {
      // Arrange
      const mockJob = new JobEntity();
      mockJob.id = 1;
      mockJob.title = 'Senior Developer';

      const expectedResult: JobEntity[] = [mockJob];
      const loadSpy = jest
        .spyOn(service, 'load')
        .mockResolvedValue(expectedResult);

      // Act
      const result = await controller.load();

      // Assert
      expect(loadSpy).toHaveBeenCalledTimes(1);
      expect(result).toEqual(expectedResult);
      expect(result[0].title).toBe('Senior Developer');
    });

    it('should handle errors from jobsService.load gracefully', async () => {
      // Arrange
      const error = new Error('Provider API is down');
      jest.spyOn(service, 'load').mockRejectedValue(error);

      // Act & Assert
      await expect(controller.load()).rejects.toThrow(error);
    });
  });
});
