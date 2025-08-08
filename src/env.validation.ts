import { plainToInstance, Type } from 'class-transformer';
import {
  IsEnum,
  IsNotEmpty,
  IsPort,
  IsUrl,
  validateSync,
} from 'class-validator';

export enum Environment {
  Local = 'local',
  Development = 'development',
  Production = 'production',
}

export class EnvironmentVariables {
  @IsEnum(Environment)
  @IsNotEmpty()
  NODE_ENV: Environment = Environment.Development;

  @IsPort()
  @IsNotEmpty()
  @Type(() => String)
  PORT: string = '3000';

  @IsUrl()
  @IsNotEmpty()
  PROVIDER_ONE: string;

  @IsUrl()
  @IsNotEmpty()
  PROVIDER_TWO: string;
}

export function validate(config: Record<string, unknown>) {
  const validatedConfig = plainToInstance(EnvironmentVariables, config, {
    enableImplicitConversion: true,
  });
  const errors = validateSync(validatedConfig, {
    skipMissingProperties: false,
  });

  if (errors.length > 0) {
    throw new Error(`${errors}`);
  }
  return validatedConfig;
}
