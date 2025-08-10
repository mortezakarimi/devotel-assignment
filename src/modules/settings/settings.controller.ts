import {
  Body,
  ClassSerializerInterceptor,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseEnumPipe,
  Put,
  UseInterceptors,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBody,
  ApiInternalServerErrorResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
} from '@nestjs/swagger';
import { SettingsService } from './settings.service';
import { SetSettingDto, SettingResponseDto } from './dto';
import { SettingKeyEnum } from '@/database/entities/enums/setting-key.enum';
import { ErrorDto } from '@/common/dto/error.dto';

/**
 * Controller for managing application settings
 * @description Provides REST API endpoints for CRUD operations on application configuration settings
 */
@ApiTags('Settings')
@Controller('settings')
@UseInterceptors(ClassSerializerInterceptor)
@UsePipes(new ValidationPipe({ transform: true, whitelist: true }))
export class SettingsController {
  constructor(private readonly settingsService: SettingsService) {}

  /**
   * GET /settings
   * Retrieves all application settings
   */
  @Get()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Get all settings',
    description: 'Retrieves a list of all application configuration settings',
  })
  @ApiOkResponse({
    description: 'Settings retrieved successfully',
    type: [SettingResponseDto],
  })
  @ApiInternalServerErrorResponse({
    description: 'Internal server error',
    type: ErrorDto,
  })
  async getAllSettings(): Promise<SettingResponseDto[]> {
    return this.settingsService.getAllSettings();
  }

  /**
   * GET /settings/:key
   * Retrieves a specific setting by key
   */
  @Get(':key')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Get setting by key',
    description: 'Retrieves a specific application setting by its key',
  })
  @ApiParam({
    name: 'key',
    description: 'The setting key to retrieve',
    enum: SettingKeyEnum,
    enumName: 'SettingKeyEnum',
    example: SettingKeyEnum.JobFetchScheduleInterval,
  })
  @ApiOkResponse({
    description: 'Setting retrieved successfully',
    type: SettingResponseDto,
  })
  @ApiNotFoundResponse({
    description: 'Setting not found',
    type: ErrorDto,
  })
  @ApiInternalServerErrorResponse({
    description: 'Internal server error',
    type: ErrorDto,
  })
  async getSetting(
    @Param('key', new ParseEnumPipe(SettingKeyEnum)) key: SettingKeyEnum,
  ): Promise<SettingResponseDto> {
    return this.settingsService.getSettingEntity(key);
  }

  /**
   * PUT /settings/:key
   * Updates an existing setting value
   */
  @Put(':key')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Update setting',
    description: 'Updates the value of an existing setting',
  })
  @ApiParam({
    name: 'key',
    description: 'The setting key to update',
    enum: SettingKeyEnum,
    enumName: 'SettingKeyEnum',
    example: SettingKeyEnum.JobFetchScheduleInterval,
  })
  @ApiBody({
    type: SetSettingDto,
    description: 'The new setting value',
  })
  @ApiOkResponse({
    description: 'Setting updated successfully',
    type: SettingResponseDto,
  })
  @ApiBadRequestResponse({
    description: 'Invalid request data or validation failed',
    type: ErrorDto,
  })
  @ApiNotFoundResponse({
    description: 'Setting not found',
    type: ErrorDto,
  })
  @ApiInternalServerErrorResponse({
    description: 'Internal server error',
    type: ErrorDto,
  })
  async updateSetting(
    @Param('key', new ParseEnumPipe(SettingKeyEnum)) key: SettingKeyEnum,
    @Body() setSettingDto: SetSettingDto,
  ): Promise<SettingResponseDto> {
    const { value } = setSettingDto;
    return this.settingsService.setSetting(key, value);
  }
  /**
   * GET /settings/:key/exists
   * Checks if a setting exists
   */
  @Get(':key/exists')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Check if setting exists',
    description: 'Checks whether a specific setting exists in the system',
  })
  @ApiParam({
    name: 'key',
    description: 'The setting key to check',
    enum: SettingKeyEnum,
    enumName: 'SettingKeyEnum',
    example: SettingKeyEnum.JobFetchScheduleInterval,
  })
  @ApiOkResponse({
    description: 'Existence check completed',
    schema: {
      type: 'object',
      properties: {
        exists: {
          type: 'boolean',
          description: 'Whether the setting exists',
          example: true,
        },
        key: {
          type: 'string',
          description: 'The setting key that was checked',
          example: SettingKeyEnum.JobFetchScheduleInterval,
        },
      },
    },
  })
  @ApiInternalServerErrorResponse({
    description: 'Internal server error',
    type: ErrorDto,
  })
  async checkSettingExists(
    @Param('key', new ParseEnumPipe(SettingKeyEnum)) key: SettingKeyEnum,
  ): Promise<{ exists: boolean; key: SettingKeyEnum }> {
    const exists = await this.settingsService.settingExists(key);
    return { exists, key };
  }
}
