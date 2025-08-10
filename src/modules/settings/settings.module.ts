import { Global, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SettingsService } from './settings.service';
import { SettingsController } from './settings.controller';
import { SettingEntity } from '@/database/entities/setting.entity';

/**
 * Global module for managing application settings
 * @description Provides settings management functionality across the application
 */
@Global()
@Module({
  imports: [TypeOrmModule.forFeature([SettingEntity])],
  providers: [SettingsService],
  exports: [SettingsService],
  controllers: [SettingsController],
})
export class SettingsModule {}
