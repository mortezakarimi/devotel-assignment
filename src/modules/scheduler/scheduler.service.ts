import {
  BadRequestException,
  Injectable,
  Logger,
  OnApplicationShutdown,
  OnModuleInit,
} from '@nestjs/common';
import { SettingKeyEnum } from '@/database/entities/enums/setting-key.enum';
import { SchedulerRegistry } from '@nestjs/schedule';
import { SettingsService } from '@/modules/settings/settings.service';
import { JobsService } from '@/modules/jobs/jobs.service';

/**
 * Service for managing application scheduling and job fetching intervals
 * @description Handles the creation, management, and execution of scheduled tasks
 * for fetching jobs from external providers at configurable intervals.
 *
 * Features:
 * - Automatic interval management on module initialization and shutdown
 * - Configurable job fetch intervals via settings
 * - Manual schedule reloading and execution
 * - Comprehensive logging and error handling
 *
 * @example
 * ```typescript
 * // The service automatically starts on module initialization
 * // and can be controlled via API endpoints
 * ```
 */
@Injectable()
export class SchedulerService implements OnModuleInit, OnApplicationShutdown {
  private readonly logger = new Logger(SchedulerService.name);
  private readonly DEFAULT_MIN_INTERVAL = 10000; // 10 seconds

  constructor(
    private schedulerRegistry: SchedulerRegistry,
    private readonly settingsService: SettingsService,
    private readonly jobsService: JobsService,
  ) {}

  /**
   * Adds a new job fetch interval to the scheduler
   * @param milliseconds - The interval duration in milliseconds
   * @returns boolean - True if interval was added successfully, false otherwise
   * @throws BadRequestException if interval is less than minimum allowed duration
   *
   * @example
   * ```typescript
   * // Add a 30-second interval
   * const success = await this.addJobFetchInterval(30000);
   *
   * // Add with custom name
   * const success = await this.addJobFetchInterval(60000, 'CustomJobFetch');
   * ```
   */
  addJobFetchInterval(milliseconds: number): boolean {
    if (milliseconds < this.DEFAULT_MIN_INTERVAL) {
      const errorMessage = `Interval must be at least ${this.DEFAULT_MIN_INTERVAL} milliseconds, received: ${milliseconds}`;
      this.logger.error(errorMessage);
      throw new BadRequestException(errorMessage);
    }

    try {
      // Remove existing interval if it exists
      if (this.schedulerRegistry.doesExist('interval', 'JobFetch')) {
        this.logger.warn(`Removing existing interval: JobFetch`);
        this.schedulerRegistry.deleteInterval('JobFetch');
      }

      const callback = async () => {
        try {
          this.logger.debug(
            `Executing scheduled job fetch at interval: JobFetch`,
          );
          await this.jobsService.load();
          this.logger.log(
            `Successfully executed scheduled job fetch: JobFetch`,
          );
        } catch (error) {
          this.logger.error(
            `Error executing scheduled job fetch JobFetch:`,
            error,
          );
        }
      };

      const interval = setInterval(callback, milliseconds);
      this.schedulerRegistry.addInterval('JobFetch', interval);

      this.logger.log(
        `Successfully added job fetch interval: JobFetch (${milliseconds}ms)`,
      );
      return true;
    } catch (error) {
      this.logger.error(`Failed to add job fetch interval: JobFetch`, error);
      return false;
    }
  }

  /**
   * Deletes an interval by name
   * @param name - The name of the interval to delete
   * @returns boolean - True if interval was deleted successfully, false otherwise
   *
   * @example
   * ```typescript
   * const success = await this.deleteInterval('JobFetch');
   * ```
   */
  deleteInterval(name: string): boolean {
    try {
      if (!this.schedulerRegistry.doesExist('interval', name)) {
        this.logger.warn(`Interval ${name} does not exist`);
        return false;
      }

      this.schedulerRegistry.deleteInterval(name);
      this.logger.log(`Successfully deleted interval: ${name}`);
      return true;
    } catch (error) {
      this.logger.error(`Failed to delete interval: ${name}`, error);
      return false;
    }
  }

  /**
   * Gets all active intervals
   * @returns string[] - Array of active interval names
   *
   * @example
   * ```typescript
   * const intervals = this.getAllIntervals();
   * console.log('Active intervals:', intervals);
   * ```
   */
  getAllIntervals(): string[] {
    try {
      const intervals = this.schedulerRegistry.getIntervals();
      this.logger.debug(`Retrieved ${intervals.length} active intervals`);
      return intervals;
    } catch (error) {
      this.logger.error('Failed to retrieve intervals', error);
      return [];
    }
  }

  /**
   * Checks if an interval exists
   * @param name - The name of the interval to check
   * @returns boolean - True if interval exists, false otherwise
   *
   * @example
   * ```typescript
   * const exists = this.intervalExists('JobFetch');
   * ```
   */
  intervalExists(name: string): boolean {
    try {
      return this.schedulerRegistry.doesExist('interval', name);
    } catch (error) {
      this.logger.error(`Failed to check if interval exists: ${name}`, error);
      return false;
    }
  }

  /**
   * Reloads all schedules by clearing existing intervals and recreating them
   * @returns object - Status of the reload operation
   *
   * @example
   * ```typescript
   * const result = await this.reloadAllSchedules();
   * console.log('Reload result:', result);
   * ```
   */

  /**
   * Gets the current status of all schedules
   * @returns object - Comprehensive status information
   *
   * @example
   * ```typescript
   * const status = this.getSchedulesStatus();
   * console.log('Schedules status:', status);
   * ```
   */
  getSchedulesStatus(): {
    totalIntervals: number;
    activeIntervals: string[];
    nextExecutionTime?: string;
    isRunning: boolean;
  } {
    try {
      const intervals = this.getAllIntervals();
      const isRunning = intervals.length > 0;

      return {
        totalIntervals: intervals.length,
        activeIntervals: intervals,
        isRunning,
        nextExecutionTime: isRunning
          ? 'Based on configured intervals'
          : undefined,
      };
    } catch (error) {
      this.logger.error('Failed to get schedules status', error);
      return {
        totalIntervals: 0,
        activeIntervals: [],
        isRunning: false,
      };
    }
  }

  /**
   * Initializes schedules from settings on module startup
   * @private
   */
  private async initializeSchedules(): Promise<void> {
    try {
      const schedulerInterval = await this.settingsService.getSetting<number>(
        SettingKeyEnum.JobFetchScheduleInterval,
      );

      if (schedulerInterval) {
        this.logger.log(
          `Initializing scheduler with interval: ${schedulerInterval}ms`,
        );
        this.addJobFetchInterval(schedulerInterval);
      } else {
        this.logger.warn(
          'No scheduler interval found in settings, using default',
        );
        // You can set a default interval here if needed
        // this.addJobFetchInterval(60000); // 1 minute default
      }
    } catch (error) {
      this.logger.error('Failed to initialize schedules from settings', error);
      throw error;
    }
  }

  /**
   * Lifecycle hook: Called when the module is initialized
   * Sets up the initial job fetch interval from settings
   */
  async onModuleInit(): Promise<void> {
    this.logger.log('Initializing SchedulerService...');
    try {
      await this.initializeSchedules();
      this.logger.log('SchedulerService initialized successfully');
    } catch (error) {
      this.logger.error('Failed to initialize SchedulerService', error); // fail silence
    }
  }

  /**
   * Lifecycle hook: Called when the application is shutting down
   * Cleans up all active intervals to prevent memory leaks
   * @param signal - The shutdown signal received
   */
  async onApplicationShutdown(signal?: string): Promise<void> {
    this.logger.log(`Application shutting down with signal: ${signal}`);

    try {
      const intervals = this.getAllIntervals();
      this.logger.log(`Cleaning up ${intervals.length} active intervals...`);

      intervals.forEach((intervalName) => {
        this.deleteInterval(intervalName);
      });

      this.logger.log('All intervals cleaned up successfully');
    } catch (error) {
      this.logger.error('Error during shutdown cleanup', error);
    }
  }
}
