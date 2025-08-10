import { Test, TestingModule } from '@nestjs/testing';
import { ArgumentsHost, HttpStatus, Logger } from '@nestjs/common';
import { DatabaseExceptionFilter } from './database-exception.filter';
import { QueryFailedError } from 'typeorm';
import { EntityNotFoundError } from 'typeorm/error/EntityNotFoundError';
import * as postgresErrorCodes from '@/common/constants/postgres-error-codes.constant';

// Mock the getErrorMessage function
jest.mock('@/common/constants/postgres-error-codes.constant', () => ({
  getErrorMessage: jest.fn(),
}));

describe('DatabaseExceptionFilter', () => {
  let filter: DatabaseExceptionFilter;
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  let logger: Logger;

  // Mock ArgumentsHost and Response for testing
  const mockJson = jest.fn();
  const mockStatus = jest.fn().mockImplementation(() => ({
    json: mockJson,
  }));
  const mockGetResponse = jest.fn().mockImplementation(() => ({
    status: mockStatus,
  }));
  const mockSwitchToHttp = jest.fn().mockImplementation(() => ({
    getResponse: mockGetResponse,
  }));
  const mockArgumentsHost: ArgumentsHost = {
    switchToHttp: mockSwitchToHttp,
  } as any;

  beforeAll(async () => {
    // Disable actual logging during tests
    jest.spyOn(Logger, 'error').mockImplementation(() => {});

    const module: TestingModule = await Test.createTestingModule({
      providers: [DatabaseExceptionFilter, Logger],
    }).compile();

    filter = module.get<DatabaseExceptionFilter>(DatabaseExceptionFilter);
    logger = module.get<Logger>(Logger);
  });

  beforeEach(() => {
    // Reset mocks before each test
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(filter).toBeDefined();
  });

  describe('catch EntityNotFoundError', () => {
    it('should handle EntityNotFoundError and return 404 NOT_FOUND', () => {
      // Arrange
      const exception = new EntityNotFoundError('User', {});

      // Act
      filter.catch(exception, mockArgumentsHost);

      // Assert
      expect(mockSwitchToHttp).toHaveBeenCalledTimes(1);
      expect(mockGetResponse).toHaveBeenCalledTimes(1);
      expect(mockStatus).toHaveBeenCalledWith(HttpStatus.NOT_FOUND);
      expect(mockJson).toHaveBeenCalledWith({
        message: 'Selected record(s) not found.',
        error: 'Not Found',
        statusCode: HttpStatus.NOT_FOUND,
      });
    });
  });

  describe('catch QueryFailedError', () => {
    it('should handle QueryFailedError, call getErrorMessage, and log the error', () => {
      // Arrange
      const driverError = { code: '23505' }; // Unique violation
      const exception = new QueryFailedError('query', [], {
        ...new Error('driver error'),
        code: driverError.code,
      });

      const mockErrorResponse = {
        statusCode: HttpStatus.CONFLICT,
        message: 'Duplicate entry',
        error: 'Conflict',
      };
      (postgresErrorCodes.getErrorMessage as jest.Mock).mockReturnValue(
        mockErrorResponse,
      );

      // Act
      filter.catch(exception, mockArgumentsHost);

      // Assert
      expect(postgresErrorCodes.getErrorMessage).toHaveBeenCalledWith(
        driverError.code,
      );
      expect(mockStatus).toHaveBeenCalledWith(mockErrorResponse.statusCode);
      expect(mockJson).toHaveBeenCalledWith(mockErrorResponse);
    });

    it('should use a default error for an unhandled driver error code', () => {
      // Arrange
      const driverError = { code: 'XXXXX' }; // Unknown error code
      const exception = new QueryFailedError('query', [], {
        ...new Error('driver error'),
        code: driverError.code,
      });

      const mockDefaultErrorResponse = {
        statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
        message: 'Internal server error',
        error: 'Internal Server Error',
      };
      (postgresErrorCodes.getErrorMessage as jest.Mock).mockReturnValue(
        mockDefaultErrorResponse,
      );

      // Act
      filter.catch(exception, mockArgumentsHost);

      // Assert
      expect(postgresErrorCodes.getErrorMessage).toHaveBeenCalledWith(
        driverError.code,
      );
      expect(mockStatus).toHaveBeenCalledWith(
        mockDefaultErrorResponse.statusCode,
      );
      expect(mockJson).toHaveBeenCalledWith(mockDefaultErrorResponse);
    });
  });
});
