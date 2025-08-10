import { format, transport, transports } from 'winston';
import {
  utilities as nestWinstonModuleUtilities,
  WinstonModule,
} from 'nest-winston'; // Make sure to install this package: npm i winston-daily-rotate-file
import 'winston-daily-rotate-file';

/**
 * Creates a Winston logger instance configured for a NestJS application.
 *
 * Configuration is driven by environment variables:
 * - DEBUG: ('true' | 'false') - Sets log level to 'debug' if true, otherwise 'info'.
 * - LOGGER_TYPE: ('CONSOLE' | 'JSON' | 'JSON_FILE') - Sets the logging strategy.
 * - 'CONSOLE': Human-readable, colored console logs.
 * - 'JSON': Structured JSON logs to the console.
 * - 'JSON_FILE': Structured JSON logs to both the console and a rotating file.
 * - Defaults to 'CONSOLE'.
 * - LOG_FILE_PATH: (string) - The directory path to store log files. Defaults to 'logs'.
 *
 * @param appName The name of the application, used in the console log format.
 * @returns A configured logger instance for the WinstonModule.
 */
export const LoggerFactory = (appName: string) => {
  // --- Environment-based configuration ---
  const DEBUG = process.env.DEBUG === 'true';
  const LOGGER_TYPE = process.env.LOGGER_TYPE || 'CONSOLE';
  const LOG_FILE_PATH = process.env.LOG_FILE_PATH || 'logs';

  // --- Transports Configuration ---
  const allTransports: transport[] = [];

  switch (LOGGER_TYPE) {
    case 'JSON_FILE': {
      // Log to both a rotating file and the console using JSON format.
      const fileFormat = format.combine(
        format.timestamp(),
        format.errors({ stack: true }), // Log stack traces for errors
        format.json(),
      );

      const fileTransport = new transports.DailyRotateFile({
        filename: `${LOG_FILE_PATH}/%DATE%-${appName}.log`, // Filename pattern
        datePattern: 'YYYY-MM-DD',
        zippedArchive: true, // Zip old logs
        maxSize: '20m', // Rotate when file size reaches 20MB
        maxFiles: '14d', // Keep logs for 14 days
        format: fileFormat,
      });

      allTransports.push(fileTransport as transport);
      break;
    }
    // Fallthrough to also add the JSON console logger
    case 'JSON': {
      // Log to the console using JSON format.
      const jsonConsoleFormat = format.combine(
        format.timestamp(),
        format.ms(),
        format.json(),
      );
      allTransports.push(new transports.Console({ format: jsonConsoleFormat }));
      break;
    }

    case 'CONSOLE':
    default: {
      // Log to the console using a human-readable, NestJS-like format.
      const nestLikeConsoleFormat = format.combine(
        format.timestamp(),
        format.ms(),
        nestWinstonModuleUtilities.format.nestLike(appName, {
          colors: true,
          prettyPrint: true,
        }),
      );
      allTransports.push(
        new transports.Console({ format: nestLikeConsoleFormat }),
      );
      break;
    }
  }

  // 3. Create and return the logger instance
  return WinstonModule.createLogger({
    level: DEBUG ? 'debug' : 'info',
    transports: allTransports,
  });
};
