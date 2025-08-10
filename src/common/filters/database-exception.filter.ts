import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpStatus,
  Logger,
} from '@nestjs/common';

import { Response } from 'express';
import { QueryFailedError } from 'typeorm';
import { EntityNotFoundError } from 'typeorm/error/EntityNotFoundError';

import { getErrorMessage } from '@/common/constants/postgres-error-codes.constant';

/**
 * Custom exception filter to convert EntityNotFoundError from TypeOrm to NestJs responses
 * @see also @https://docs.nestjs.com/exception-filters
 */
@Catch(EntityNotFoundError, QueryFailedError)
export class DatabaseExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(DatabaseExceptionFilter.name);
  public catch(
    exception: EntityNotFoundError | QueryFailedError<any>,
    host: ArgumentsHost,
  ) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    if (exception instanceof QueryFailedError) {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
      const error = getErrorMessage(exception.driverError.code);
      this.logger.error(
        exception.message,
        exception.stack,
        JSON.stringify(exception, null, 2),
      );
      return response.status(error.statusCode).json(error);
    }
    return response.status(HttpStatus.NOT_FOUND).json({
      message: 'Selected record(s) not found.',
      error: 'Not Found',
      statusCode: HttpStatus.NOT_FOUND,
    });
  }
}
