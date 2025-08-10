import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SettingEntity } from '@/database/entities/setting.entity';
import { SettingKeyEnum } from '@/database/entities/enums/setting-key.enum';

/**
 * Service for managing application settings
 * @description Handles CRUD operations for application configuration settings
 */
@Injectable()
export class SettingsService {
  private readonly logger = new Logger(SettingsService.name);

  constructor(
    @InjectRepository(SettingEntity)
    private readonly settingRepository: Repository<SettingEntity>,
  ) {}

  /**
   * Retrieves a setting value by key
   * @param key - The setting key to retrieve
   * @returns The setting value or null if not found
   * @throws NotFoundException if the setting doesn't exist
   */
  public async getSetting<T = any>(key: SettingKeyEnum): Promise<T | null> {
    try {
      this.logger.debug(`Retrieving setting: ${key}`);

      const setting = await this.settingRepository.findOneBy({ key });

      if (!setting) {
        this.logger.warn(`Setting not found: ${key}`);
        return null;
      }

      this.logger.debug(
        `Setting retrieved: ${key} = ${JSON.stringify(setting.value)}`,
      );
      return setting.value as T;
    } catch (error) {
      this.logger.error(`Error retrieving setting ${key}:`, error);
      throw error;
    }
  }

  /**
   * Retrieves a setting entity by key
   * @param key - The setting key to retrieve
   * @returns The complete setting entity
   * @throws NotFoundException if the setting doesn't exist
   */
  public async getSettingEntity(key: SettingKeyEnum): Promise<SettingEntity> {
    try {
      this.logger.debug(`Retrieving setting entity: ${key}`);

      const setting = await this.settingRepository.findOneBy({ key });

      if (!setting) {
        this.logger.warn(`Setting entity not found: ${key}`);
        throw new NotFoundException(`Setting ${key} not found`);
      }

      return setting;
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      this.logger.error(`Error retrieving setting entity ${key}:`, error);
      throw error;
    }
  }

  /**
   * Updates an existing setting value
   * @param key - The setting key to update
   * @param value - The new value to set
   * @returns The updated setting entity
   * @throws NotFoundException if the setting doesn't exist
   * @throws BadRequestException if the value is invalid
   */
  public async setSetting<T = any>(
    key: SettingKeyEnum,
    value: T,
  ): Promise<SettingEntity> {
    try {
      this.logger.debug(`Setting value for ${key}: ${JSON.stringify(value)}`);

      // Validate the value based on the key
      this.validateSettingValue(key, value);

      const setting = await this.settingRepository.findOneBy({ key });

      if (!setting) {
        this.logger.warn(`Setting not found for update: ${key}`);
        throw new NotFoundException(`Setting ${key} not found`);
      }

      setting.value = value;
      const updatedSetting = await this.settingRepository.save(setting);

      this.logger.log(`Setting updated: ${key} = ${JSON.stringify(value)}`);
      return updatedSetting;
    } catch (error) {
      if (
        error instanceof NotFoundException ||
        error instanceof BadRequestException
      ) {
        throw error;
      }
      this.logger.error(`Error updating setting ${key}:`, error);
      throw error;
    }
  }

  /**
   * Retrieves all settings
   * @returns Array of all setting entities
   */
  public async getAllSettings(): Promise<SettingEntity[]> {
    try {
      this.logger.debug('Retrieving all settings');

      const settings = await this.settingRepository.find({
        order: { key: 'ASC' },
      });

      this.logger.debug(`Retrieved ${settings.length} settings`);
      return settings;
    } catch (error) {
      this.logger.error('Error retrieving all settings:', error);
      throw error;
    }
  }

  /**
   * Validates setting values based on the key
   * @param key - The setting key
   * @param value - The value to validate
   * @throws BadRequestException if the value is invalid
   */
  private validateSettingValue(key: SettingKeyEnum, value: any): void {
    switch (key) {
      case SettingKeyEnum.JobFetchScheduleInterval:
        if (typeof value !== 'number' || value < 10000 || value > 86400000) {
          throw new BadRequestException(
            `JobFetchScheduleInterval must be a number between 10000 and 86400000 milliseconds (10 second to 24 hours)`,
          );
        }
        break;
      default:
        // For unknown keys, just ensure the value is not undefined or null
        if (value === undefined || value === null) {
          throw new BadRequestException(
            `Value cannot be undefined or null for key: ${key}`,
          );
        }
        break;
    }
  }

  /**
   * Checks if a setting exists
   * @param key - The setting key to check
   * @returns True if the setting exists, false otherwise
   */
  public async settingExists(key: SettingKeyEnum): Promise<boolean> {
    try {
      const count = await this.settingRepository.countBy({ key });
      return count > 0;
    } catch (error) {
      this.logger.error(`Error checking if setting exists ${key}:`, error);
      throw error;
    }
  }
}
