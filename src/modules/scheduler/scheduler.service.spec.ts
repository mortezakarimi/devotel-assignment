import { Test, TestingModule } from '@nestjs/testing';
import { SchedulerService } from './scheduler.service';
import { SchedulerRegistry } from '@nestjs/schedule';
import { SettingsService } from '@/modules/settings/settings.service';
import { JobsService } from '@/modules/jobs/jobs.service';
import { SettingKeyEnum } from '@/database/entities/enums/setting-key.enum';
import { BadRequestException, Logger } from '@nestjs/common';

describe('SchedulerService', () => {
  let service: SchedulerService;
  let schedulerRegistry: jest.Mocked<SchedulerRegistry>;
  let settingsService: jest.Mocked<SettingsService>;
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  let jobsService: jest.Mocked<JobsService>;

  beforeEach(async () => {
    const mockSchedulerRegistry = {
      addInterval: jest.fn(),
      deleteInterval: jest.fn(),
      getIntervals: jest.fn(),
      doesExist: jest.fn(),
    };

    const mockSettingsService = {
      getSetting: jest.fn(),
    };

    const mockJobsService = {
      load: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SchedulerService,
        {
          provide: SchedulerRegistry,
          useValue: mockSchedulerRegistry,
        },
        {
          provide: SettingsService,
          useValue: mockSettingsService,
        },
        {
          provide: JobsService,
          useValue: mockJobsService,
        },
      ],
    }).compile();

    service = module.get<SchedulerService>(SchedulerService);
    schedulerRegistry = module.get(SchedulerRegistry);
    settingsService = module.get(SettingsService);
    jobsService = module.get(JobsService);

    // Mock console methods to avoid noise in tests
    jest.spyOn(Logger.prototype, 'log').mockImplementation(() => {});
    jest.spyOn(Logger.prototype, 'debug').mockImplementation(() => {});
    jest.spyOn(Logger.prototype, 'warn').mockImplementation(() => {});
    jest.spyOn(Logger.prototype, 'error').mockImplementation(() => {});
    jest.useFakeTimers();
    jest.spyOn(global, 'setInterval');
  });

  afterEach(() => {
    jest.clearAllMocks();
    jest.useRealTimers();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('addJobFetchInterval', () => {
    it('should successfully add a job fetch interval', () => {
      const milliseconds = 30000;
      const intervalName = 'JobFetch';

      schedulerRegistry.doesExist.mockReturnValue(false);
      schedulerRegistry.addInterval.mockImplementation(() => {});

      const result = service.addJobFetchInterval(milliseconds);

      expect(result).toBe(true);
      expect(schedulerRegistry.addInterval).toHaveBeenCalledWith(
        intervalName,
        expect.any(Object),
      );
    });

    it('should throw BadRequestException for intervals less than minimum', () => {
      const milliseconds = 5000; // Less than 10000ms minimum

      expect(() => service.addJobFetchInterval(milliseconds)).toThrow(
        BadRequestException,
      );
      expect(() => service.addJobFetchInterval(milliseconds)).toThrow(
        'Interval must be at least 10000 milliseconds',
      );
    });

    it('should remove existing interval before adding new one', () => {
      const milliseconds = 30000;
      const intervalName = 'JobFetch';

      schedulerRegistry.doesExist.mockReturnValue(true);
      schedulerRegistry.deleteInterval.mockImplementation(() => {});
      schedulerRegistry.addInterval.mockImplementation(() => {});

      const result = service.addJobFetchInterval(milliseconds);

      expect(result).toBe(true);
      expect(schedulerRegistry.deleteInterval).toHaveBeenCalledWith(
        intervalName,
      );
      expect(schedulerRegistry.addInterval).toHaveBeenCalledWith(
        intervalName,
        expect.any(Object),
      );
    });

    it('should use default interval name when not provided', () => {
      const milliseconds = 30000;

      schedulerRegistry.doesExist.mockReturnValue(false);
      schedulerRegistry.addInterval.mockImplementation(() => {});

      const result = service.addJobFetchInterval(milliseconds);

      expect(result).toBe(true);
      expect(schedulerRegistry.addInterval).toHaveBeenCalledWith(
        'JobFetch',
        expect.any(Object),
      );
    });

    it('should handle errors during interval creation', () => {
      const milliseconds = 30000;

      schedulerRegistry.doesExist.mockReturnValue(false);
      schedulerRegistry.addInterval.mockImplementation(() => {
        throw new Error('Registry error');
      });

      const result = service.addJobFetchInterval(milliseconds);

      expect(result).toBe(false);
    });
  });

  describe('deleteInterval', () => {
    it('should successfully delete an existing interval', () => {
      const intervalName = 'TestInterval';

      schedulerRegistry.doesExist.mockReturnValue(true);
      schedulerRegistry.deleteInterval.mockImplementation(() => {});

      const result = service.deleteInterval(intervalName);

      expect(result).toBe(true);
      expect(schedulerRegistry.deleteInterval).toHaveBeenCalledWith(
        intervalName,
      );
    });

    it('should return false for non-existent intervals', () => {
      const intervalName = 'NonExistentInterval';

      schedulerRegistry.doesExist.mockReturnValue(false);

      const result = service.deleteInterval(intervalName);

      expect(result).toBe(false);
      expect(schedulerRegistry.deleteInterval).not.toHaveBeenCalled();
    });

    it('should handle errors during deletion', () => {
      const intervalName = 'TestInterval';

      schedulerRegistry.doesExist.mockReturnValue(true);
      schedulerRegistry.deleteInterval.mockImplementation(() => {
        throw new Error('Delete error');
      });

      const result = service.deleteInterval(intervalName);

      expect(result).toBe(false);
    });
  });

  describe('getAllIntervals', () => {
    it('should return all active intervals', () => {
      const mockIntervals = ['Interval1', 'Interval2', 'Interval3'];

      schedulerRegistry.getIntervals.mockReturnValue(mockIntervals);

      const result = service.getAllIntervals();

      expect(result).toEqual(mockIntervals);
      expect(schedulerRegistry.getIntervals).toHaveBeenCalled();
    });

    it('should return empty array on error', () => {
      schedulerRegistry.getIntervals.mockImplementation(() => {
        throw new Error('Registry error');
      });

      const result = service.getAllIntervals();

      expect(result).toEqual([]);
    });
  });

  describe('intervalExists', () => {
    it('should return true for existing intervals', () => {
      const intervalName = 'ExistingInterval';

      schedulerRegistry.doesExist.mockReturnValue(true);

      const result = service.intervalExists(intervalName);

      expect(result).toBe(true);
      expect(schedulerRegistry.doesExist).toHaveBeenCalledWith(
        'interval',
        intervalName,
      );
    });

    it('should return false for non-existent intervals', () => {
      const intervalName = 'NonExistentInterval';

      schedulerRegistry.doesExist.mockReturnValue(false);

      const result = service.intervalExists(intervalName);

      expect(result).toBe(false);
    });

    it('should return false on error', () => {
      const intervalName = 'TestInterval';

      schedulerRegistry.doesExist.mockImplementation(() => {
        throw new Error('Registry error');
      });

      const result = service.intervalExists(intervalName);

      expect(result).toBe(false);
    });
  });

  describe('getSchedulesStatus', () => {
    it('should return correct status for active schedules', () => {
      const activeIntervals = ['Interval1', 'Interval2'];

      schedulerRegistry.getIntervals.mockReturnValue(activeIntervals);

      const result = service.getSchedulesStatus();

      expect(result.totalIntervals).toBe(2);
      expect(result.activeIntervals).toEqual(activeIntervals);
      expect(result.isRunning).toBe(true);
      expect(result.nextExecutionTime).toBe('Based on configured intervals');
    });

    it('should return correct status for no active schedules', () => {
      schedulerRegistry.getIntervals.mockReturnValue([]);

      const result = service.getSchedulesStatus();

      expect(result.totalIntervals).toBe(0);
      expect(result.activeIntervals).toEqual([]);
      expect(result.isRunning).toBe(false);
      expect(result.nextExecutionTime).toBeUndefined();
    });

    it('should handle errors and return default status', () => {
      schedulerRegistry.getIntervals.mockImplementation(() => {
        throw new Error('Registry error');
      });

      const result = service.getSchedulesStatus();

      expect(result.totalIntervals).toBe(0);
      expect(result.activeIntervals).toEqual([]);
      expect(result.isRunning).toBe(false);
    });
  });

  describe('onModuleInit', () => {
    it('should initialize schedules successfully', async () => {
      const mockInterval = 60000;

      settingsService.getSetting.mockResolvedValue(mockInterval);
      schedulerRegistry.doesExist.mockReturnValue(false);
      schedulerRegistry.addInterval.mockImplementation(() => {});

      await service.onModuleInit();

      expect(settingsService.getSetting).toHaveBeenCalledWith(
        SettingKeyEnum.JobFetchScheduleInterval,
      );
      expect(schedulerRegistry.addInterval).toHaveBeenCalledWith(
        'JobFetch',
        expect.any(Object),
      );
    });

    it('should handle missing interval setting', async () => {
      settingsService.getSetting.mockResolvedValue(null);

      await service.onModuleInit();

      expect(settingsService.getSetting).toHaveBeenCalledWith(
        SettingKeyEnum.JobFetchScheduleInterval,
      );
      // Should not add any intervals
    });
  });

  describe('onApplicationShutdown', () => {
    it('should clean up all intervals on shutdown', async () => {
      const activeIntervals = ['Interval1', 'Interval2'];

      schedulerRegistry.getIntervals.mockReturnValue(activeIntervals);
      schedulerRegistry.doesExist.mockReturnValue(true);
      schedulerRegistry.deleteInterval.mockImplementation(() => {});

      await service.onApplicationShutdown('SIGTERM');

      expect(schedulerRegistry.getIntervals).toHaveBeenCalled();
      expect(schedulerRegistry.deleteInterval).toHaveBeenCalledTimes(
        activeIntervals.length,
      );
    });

    it('should handle errors during shutdown cleanup', async () => {
      schedulerRegistry.getIntervals.mockImplementation(() => {
        throw new Error('Registry error');
      });

      // Should not throw error during shutdown
      await expect(
        service.onApplicationShutdown('SIGTERM'),
      ).resolves.not.toThrow();
    });
  });
});
