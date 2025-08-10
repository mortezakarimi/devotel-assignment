import { Test, TestingModule } from '@nestjs/testing';
import { ProvidersService } from './providers.service';
import { Provider1Service } from '@/providers/provider1/provider1.service';
import { Provider2Service } from '@/providers/provider2/provider2.service';
import { JobEntity } from '@/database/entities/job.entity';
import { DeepPartial } from '@/common';

// Mock JobEntity for consistent test data
const mockJob1: DeepPartial<JobEntity> = {
  id: '1',
  title: 'Software Engineer',
  company: 'Provider One',
  url: 'http://provider1.com/job/1',
  // Add other necessary properties of JobEntity
} as any;

const mockJob2: DeepPartial<JobEntity> = {
  id: '2',
  title: 'Product Manager',
  company: 'Provider Two',
  url: 'http://provider2.com/job/2',
  // Add other necessary properties of JobEntity
} as any;

describe('ProvidersService', () => {
  let service: ProvidersService;
  let provider1Service: Provider1Service;
  let provider2Service: Provider2Service;

  // Create mock objects for the provider services
  const mockProvider1Service = {
    load: jest.fn(),
  };

  const mockProvider2Service = {
    load: jest.fn(),
  };

  beforeEach(async () => {
    // Reset mocks before each test to ensure a clean state
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      // No need to import HttpModule or ConfigModule if they aren't directly used by ProvidersService
      providers: [
        ProvidersService,
        {
          provide: Provider1Service,
          useValue: mockProvider1Service, // Use the mock object
        },
        {
          provide: Provider2Service,
          useValue: mockProvider2Service, // Use the mock object
        },
      ],
    }).compile();

    service = module.get<ProvidersService>(ProvidersService);
    // Get the injected mock instances to configure them in tests
    provider1Service = module.get<Provider1Service>(Provider1Service);
    provider2Service = module.get<Provider2Service>(Provider2Service);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('load', () => {
    it('should call load on each provider and return a combined array of jobs', async () => {
      // Arrange: Configure the mocks to return specific data
      const provider1Jobs = [mockJob1];
      const provider2Jobs = [mockJob2];

      // Use jest.spyOn if you have the mock object reference, or just mock the implementation
      mockProvider1Service.load.mockResolvedValue(provider1Jobs);
      mockProvider2Service.load.mockResolvedValue(provider2Jobs);

      // Act: Call the method being tested
      const result = await service.load();

      // Assert: Verify the outcome
      // 1. Check if the provider methods were called
      expect(provider1Service.load).toHaveBeenCalledTimes(1);
      expect(provider2Service.load).toHaveBeenCalledTimes(1);

      // 2. Check if the result is the concatenation of the mock data
      expect(result).toEqual([...provider1Jobs, ...provider2Jobs]);
      expect(result.length).toBe(2);
    });

    it('should handle cases where one provider returns an empty array', async () => {
      // Arrange
      const provider1Jobs = [mockJob1];
      const provider2Jobs: JobEntity[] = []; // Provider 2 returns no jobs

      mockProvider1Service.load.mockResolvedValue(provider1Jobs);
      mockProvider2Service.load.mockResolvedValue(provider2Jobs);

      // Act
      const result = await service.load();

      // Assert
      expect(provider1Service.load).toHaveBeenCalledTimes(1);
      expect(provider2Service.load).toHaveBeenCalledTimes(1);
      expect(result).toEqual(provider1Jobs);
      expect(result.length).toBe(1);
    });

    it('should return an empty array if all providers return empty arrays', async () => {
      // Arrange
      mockProvider1Service.load.mockResolvedValue([]);
      mockProvider2Service.load.mockResolvedValue([]);

      // Act
      const result = await service.load();

      // Assert
      expect(result).toEqual([]);
      expect(result.length).toBe(0);
    });

    it('should throw an error if one of the providers fails', async () => {
      // Arrange
      const errorMessage = 'Network Error';
      mockProvider1Service.load.mockRejectedValue(new Error(errorMessage));
      mockProvider2Service.load.mockResolvedValue([mockJob2]); // This one succeeds

      // Act & Assert
      // We expect the promise to be rejected
      await expect(service.load()).rejects.toThrow(errorMessage);
    });
  });
});
