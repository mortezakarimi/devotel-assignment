import { Test, TestingModule } from '@nestjs/testing';
import { SchedulerController } from './scheduler.controller';
import { SchedulerService } from './scheduler.service';
import { BadRequestException, Logger } from '@nestjs/common';

describe('SchedulerController', () => {
  let controller: SchedulerController;
  let schedulerService: jest.Mocked<SchedulerService>;

  beforeEach(async () => {
    const mockSchedulerService = {
      getSchedulesStatus: jest.fn(),
      getAllIntervals: jest.fn(),
      intervalExists: jest.fn(),
      addJobFetchInterval: jest.fn(),
      deleteInterval: jest.fn(),
      reloadAllSchedules: jest.fn(),
      runAllSchedules: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [SchedulerController],
      providers: [
        {
          provide: SchedulerService,
          useValue: mockSchedulerService,
        },
      ],
    }).compile();

    controller = module.get<SchedulerController>(SchedulerController);
    schedulerService = module.get(SchedulerService);

    // Mock console methods to avoid noise in tests
    jest.spyOn(Logger.prototype, 'debug').mockImplementation(() => {});
    jest.spyOn(Logger.prototype, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('getSchedulesStatus', () => {
    it('should return schedules status successfully', () => {
      const mockStatus = {
        totalIntervals: 2,
        activeIntervals: ['Interval1', 'Interval2'],
        isRunning: true,
        nextExecutionTime: 'Based on configured intervals',
      };

      schedulerService.getSchedulesStatus.mockReturnValue(mockStatus);

      const result = controller.getSchedulesStatus();

      expect(result).toEqual(mockStatus);
      expect(schedulerService.getSchedulesStatus).toHaveBeenCalled();
    });
  });

  describe('getAllIntervals', () => {
    it('should return all active intervals successfully', () => {
      const mockIntervals = ['Interval1', 'Interval2', 'Interval3'];

      schedulerService.getAllIntervals.mockReturnValue(mockIntervals);

      const result = controller.getAllIntervals();

      expect(result).toEqual(mockIntervals);
      expect(schedulerService.getAllIntervals).toHaveBeenCalled();
    });
  });

  describe('checkIntervalExists', () => {
    it('should return true for existing interval', () => {
      const intervalName = 'ExistingInterval';

      schedulerService.intervalExists.mockReturnValue(true);

      const result = controller.checkIntervalExists(intervalName);

      expect(result).toEqual({
        exists: true,
        name: intervalName,
      });
      expect(schedulerService.intervalExists).toHaveBeenCalledWith(
        intervalName,
      );
    });

    it('should return false for non-existent interval', () => {
      const intervalName = 'NonExistentInterval';

      schedulerService.intervalExists.mockReturnValue(false);

      const result = controller.checkIntervalExists(intervalName);

      expect(result).toEqual({
        exists: false,
        name: intervalName,
      });
      expect(schedulerService.intervalExists).toHaveBeenCalledWith(
        intervalName,
      );
    });
  });

  describe('addInterval', () => {
    it('should use default interval name when not provided', () => {
      const requestBody = {
        milliseconds: 30000,
      };

      schedulerService.addJobFetchInterval.mockReturnValue(true);

      const result = controller.addInterval(requestBody);

      expect(result).toEqual({
        success: true,
        message: 'Successfully created interval: JobFetch (30000ms)',
        intervalName: 'JobFetch',
        duration: 30000,
      });
      expect(schedulerService.addJobFetchInterval).toHaveBeenCalledWith(30000);
    });

    it('should throw BadRequestException for missing milliseconds', () => {
      const requestBody: { milliseconds?: number } = {};

      expect(() => controller.addInterval(requestBody)).toThrow(
        BadRequestException,
      );
      expect(() => controller.addInterval(requestBody)).toThrow(
        'milliseconds must be a valid number',
      );
    });

    it('should throw BadRequestException for invalid milliseconds type', () => {
      const requestBody: { milliseconds: number } = {
        milliseconds: 'invalid' as any,
      };

      expect(() => controller.addInterval(requestBody)).toThrow(
        BadRequestException,
      );
      expect(() => controller.addInterval(requestBody)).toThrow(
        'milliseconds must be a valid number',
      );
    });

    it('should throw BadRequestException when service returns false', () => {
      const requestBody = {
        milliseconds: 60000,
        intervalName: 'TestInterval',
      };

      schedulerService.addJobFetchInterval.mockReturnValue(false);

      expect(() => controller.addInterval(requestBody)).toThrow(
        BadRequestException,
      );
      expect(() => controller.addInterval(requestBody)).toThrow(
        'Failed to create interval',
      );
    });

    it('should rethrow service errors', () => {
      const requestBody = {
        milliseconds: 60000,
        intervalName: 'TestInterval',
      };

      const serviceError = new BadRequestException('Service error');
      schedulerService.addJobFetchInterval.mockImplementation(() => {
        throw serviceError;
      });

      expect(() => controller.addInterval(requestBody)).toThrow(serviceError);
    });
  });

  describe('deleteInterval', () => {
    it('should successfully delete an existing interval', () => {
      const intervalName = 'TestInterval';

      schedulerService.deleteInterval.mockReturnValue(true);

      const result = controller.deleteInterval(intervalName);

      expect(result).toEqual({
        success: true,
        message: 'Successfully deleted interval: TestInterval',
        deletedInterval: intervalName,
      });
      expect(schedulerService.deleteInterval).toHaveBeenCalledWith(
        intervalName,
      );
    });

    it('should handle deletion of non-existent interval', () => {
      const intervalName = 'NonExistentInterval';

      schedulerService.deleteInterval.mockReturnValue(false);

      const result = controller.deleteInterval(intervalName);

      expect(result).toEqual({
        success: false,
        message:
          'Interval NonExistentInterval does not exist or could not be deleted',
        deletedInterval: intervalName,
      });
      expect(schedulerService.deleteInterval).toHaveBeenCalledWith(
        intervalName,
      );
    });

    it('should rethrow service errors', () => {
      const intervalName = 'TestInterval';

      const serviceError = new Error('Service error');
      schedulerService.deleteInterval.mockImplementation(() => {
        throw serviceError;
      });

      expect(() => controller.deleteInterval(intervalName)).toThrow(
        serviceError,
      );
    });
  });
});
