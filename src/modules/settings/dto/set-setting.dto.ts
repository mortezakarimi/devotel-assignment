import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsNotEmpty } from 'class-validator';
import { SettingKeyEnum } from '@/database/entities/enums/setting-key.enum';

/**
 * DTO for setting a configuration value
 * @description Used to update application settings with validation
 */
export class SetSettingDto {
  @ApiProperty({
    description: 'The setting key to update',
    enum: SettingKeyEnum,
    enumName: 'SettingKeyEnum',
    example: SettingKeyEnum.JobFetchScheduleInterval,
  })
  @IsEnum(SettingKeyEnum, { message: 'Invalid setting key' })
  @IsNotEmpty({ message: 'Setting key is required' })
  key: SettingKeyEnum;

  @ApiProperty({
    description: 'The value to set for the setting',
    example: 300000,
    oneOf: [
      { type: 'string' },
      { type: 'number' },
      { type: 'boolean' },
      { type: 'object' },
      { type: 'array' },
    ],
  })
  @IsNotEmpty({ message: 'Setting value is required' })
  value: any;
}

/**
 * DTO for getting a setting value
 * @description Used to retrieve specific application settings
 */
export class GetSettingDto {
  @ApiProperty({
    description: 'The setting key to retrieve',
    enum: SettingKeyEnum,
    enumName: 'SettingKeyEnum',
    example: SettingKeyEnum.JobFetchScheduleInterval,
  })
  @IsEnum(SettingKeyEnum, { message: 'Invalid setting key' })
  @IsNotEmpty({ message: 'Setting key is required' })
  key: SettingKeyEnum;
}

/**
 * Response DTO for setting operations
 * @description Contains the updated setting information
 */
export class SettingResponseDto {
  @ApiProperty({
    description: 'Unique identifier for the setting',
    example: 1,
  })
  id: number;

  @ApiProperty({
    description: 'The setting key',
    enum: SettingKeyEnum,
    enumName: 'SettingKeyEnum',
  })
  key: SettingKeyEnum;

  @ApiProperty({
    description: 'The current value of the setting',
    example: 300000,
  })
  value: any;

  @ApiProperty({
    description: 'When the setting was created',
    example: '2024-01-15T10:30:00.000Z',
  })
  createdAt: Date;

  @ApiProperty({
    description: 'When the setting was last updated',
    example: '2024-01-15T10:30:00.000Z',
  })
  updatedAt: Date;
}
