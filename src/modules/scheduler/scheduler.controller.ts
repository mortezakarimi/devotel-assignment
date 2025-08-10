import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Logger,
  Param,
  Post,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBody,
  ApiInternalServerErrorResponse,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { SchedulerService } from './scheduler.service';
import { isNumber } from 'class-validator';

/**
 * Controller for managing application scheduling and job fetching intervals
 * @description Provides REST API endpoints for controlling the scheduler service,
 * including schedule management, manual execution, and status monitoring.
 *
 * @example
 * ```bash
 * # Get current schedules status
 * GET /scheduler/status
 *
 * # Reload all schedules
 * POST /scheduler/reload
 *
 * # Run all schedules manually
 * POST /scheduler/run
 *
 * # Add a new interval
 * POST /scheduler/intervals
 *
 * # Delete an interval
 * DELETE /scheduler/intervals/{name}
 * ```
 */
@ApiTags('Scheduler')
@Controller('scheduler')
export class SchedulerController {
  private readonly logger = new Logger(SchedulerController.name);

  constructor(private readonly schedulerService: SchedulerService) {}

  /**
   * Get the current status of all schedules
   * @returns Object containing schedule status information
   */
  @Get('status')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Get schedules status',
    description:
      'Retrieves the current status of all active schedules including total intervals, active interval names, and running state.',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Successfully retrieved schedules status',
    schema: {
      type: 'object',
      properties: {
        totalIntervals: {
          type: 'number',
          description: 'Total number of active intervals',
          example: 1,
        },
        activeIntervals: {
          type: 'array',
          items: { type: 'string' },
          description: 'Array of active interval names',
          example: ['JobFetch'],
        },
        isRunning: {
          type: 'boolean',
          description: 'Whether any schedules are currently running',
          example: true,
        },
        nextExecutionTime: {
          type: 'string',
          description: 'Information about next execution time',
          example: 'Based on configured intervals',
        },
      },
    },
  })
  @ApiInternalServerErrorResponse({
    description: 'Internal server error occurred while retrieving status',
  })
  getSchedulesStatus() {
    this.logger.debug('Retrieving schedules status');
    return this.schedulerService.getSchedulesStatus();
  }

  /**
   * Get all active intervals
   * @returns Array of active interval names
   */
  @Get('intervals')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Get all active intervals',
    description: 'Retrieves a list of all currently active interval names.',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Successfully retrieved active intervals',
    schema: {
      type: 'array',
      items: { type: 'string' },
      example: ['JobFetch'],
    },
  })
  @ApiInternalServerErrorResponse({
    description: 'Internal server error occurred while retrieving intervals',
  })
  getAllIntervals() {
    this.logger.debug('Retrieving all active intervals');
    return this.schedulerService.getAllIntervals();
  }

  /**
   * Check if a specific interval exists
   * @param name - The name of the interval to check
   * @returns Object indicating whether the interval exists
   */
  @Get('intervals/:name')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Check if interval exists',
    description:
      'Checks whether a specific interval with the given name exists.',
  })
  @ApiParam({
    name: 'name',
    description: 'The name of the interval to check',
    example: 'JobFetch',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Successfully checked interval existence',
    schema: {
      type: 'object',
      properties: {
        exists: {
          type: 'boolean',
          description: 'Whether the interval exists',
          example: true,
        },
        name: {
          type: 'string',
          description: 'The interval name that was checked',
          example: 'JobFetch',
        },
      },
    },
  })
  @ApiBadRequestResponse({
    description: 'Invalid interval name provided',
  })
  @ApiInternalServerErrorResponse({
    description: 'Internal server error occurred while checking interval',
  })
  checkIntervalExists(@Param('name') name: string) {
    this.logger.debug(`Checking if interval exists: ${name}`);
    const exists = this.schedulerService.intervalExists(name);
    return { exists, name };
  }

  /**
   * Add a new job fetch interval
   * @param body - Object containing interval configuration
   * @returns Object indicating the result of adding the interval
   */
  @Post('intervals')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Add new job fetch interval',
    description:
      'Creates a new job fetch interval with the specified duration and optional custom name.',
  })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['milliseconds'],
      properties: {
        milliseconds: {
          type: 'number',
          description: 'Interval duration in milliseconds (minimum 10000ms)',
          example: 60000,
          minimum: 10000,
        },
        intervalName: {
          type: 'string',
          description:
            'Optional custom name for the interval (defaults to "JobFetch")',
          example: 'CustomJobFetch',
        },
      },
    },
  })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Successfully created new interval',
    schema: {
      type: 'object',
      properties: {
        success: {
          type: 'boolean',
          description: 'Whether the interval was created successfully',
          example: true,
        },
        message: {
          type: 'string',
          description: 'Success message',
          example: 'Successfully created interval: CustomJobFetch (60000ms)',
        },
        intervalName: {
          type: 'string',
          description: 'The name of the created interval',
          example: 'CustomJobFetch',
        },
        duration: {
          type: 'number',
          description: 'The duration of the interval in milliseconds',
          example: 60000,
        },
      },
    },
  })
  @ApiBadRequestResponse({
    description: 'Invalid interval configuration (e.g., duration too short)',
  })
  @ApiInternalServerErrorResponse({
    description: 'Internal server error occurred while creating interval',
  })
  addInterval(@Body() body: { milliseconds?: number }) {
    const { milliseconds } = body;

    if (!isNumber(milliseconds)) {
      throw new BadRequestException('milliseconds must be a valid number');
    }

    this.logger.debug(
      `Adding new interval: JobFetch' with duration: ${milliseconds}ms`,
    );

    try {
      const success = this.schedulerService.addJobFetchInterval(milliseconds);

      if (success) {
        return {
          success: true,
          message: `Successfully created interval: JobFetch (${milliseconds}ms)`,
          intervalName: 'JobFetch',
          duration: milliseconds,
        };
      } else {
        throw new BadRequestException('Failed to create interval');
      }
    } catch (error) {
      this.logger.error(`Failed to add interval: ${error.message}`);
      throw error;
    }
  }

  /**
   * Delete an interval by name
   * @param name - The name of the interval to delete
   * @returns Object indicating the result of deleting the interval
   */
  @Delete('intervals/:name')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Delete interval',
    description: 'Deletes an existing interval with the specified name.',
  })
  @ApiParam({
    name: 'name',
    description: 'The name of the interval to delete',
    example: 'JobFetch',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Successfully deleted interval',
    schema: {
      type: 'object',
      properties: {
        success: {
          type: 'boolean',
          description: 'Whether the interval was deleted successfully',
          example: true,
        },
        message: {
          type: 'string',
          description: 'Success message',
          example: 'Successfully deleted interval: JobFetch',
        },
        deletedInterval: {
          type: 'string',
          description: 'The name of the deleted interval',
          example: 'JobFetch',
        },
      },
    },
  })
  @ApiBadRequestResponse({
    description: 'Invalid interval name provided',
  })
  @ApiInternalServerErrorResponse({
    description: 'Internal server error occurred while deleting interval',
  })
  deleteInterval(@Param('name') name: string) {
    this.logger.debug(`Deleting interval: ${name}`);

    try {
      const success = this.schedulerService.deleteInterval(name);

      if (success) {
        return {
          success: true,
          message: `Successfully deleted interval: ${name}`,
          deletedInterval: name,
        };
      } else {
        return {
          success: false,
          message: `Interval ${name} does not exist or could not be deleted`,
          deletedInterval: name,
        };
      }
    } catch (error) {
      this.logger.error(`Failed to delete interval ${name}: ${error.message}`);
      throw error;
    }
  }
}
