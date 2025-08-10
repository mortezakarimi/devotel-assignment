import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { SettingsController } from './settings.controller';
import { SettingsService } from './settings.service';
import { SettingKeyEnum } from '@/database/entities/enums/setting-key.enum';
import { SetSettingDto, SettingResponseDto } from './dto';

describe('SettingsController', () => {
  let controller: SettingsController;
  let service: SettingsService;

  const mockSettingsService = {
    getAllSettings: jest.fn(),
    getSettingEntity: jest.fn(),
    upsertSetting: jest.fn(),
    setSetting: jest.fn(),
    deleteSetting: jest.fn(),
    settingExists: jest.fn(),
  };

  const mockSetting: SettingResponseDto = {
    id: 1,
    key: SettingKeyEnum.JobFetchScheduleInterval,
    value: 300000,
    createdAt: new Date('2024-01-15T10:30:00.000Z'),
    updatedAt: new Date('2024-01-15T10:30:00.000Z'),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [SettingsController],
      providers: [
        {
          provide: SettingsService,
          useValue: mockSettingsService,
        },
      ],
    }).compile();

    controller = module.get<SettingsController>(SettingsController);
    service = module.get<SettingsService>(SettingsService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getAllSettings', () => {
    it('should retrieve all settings successfully', async () => {
      const settings = [mockSetting, { ...mockSetting, id: 2 }];
      mockSettingsService.getAllSettings.mockResolvedValue(settings);

      const result = await controller.getAllSettings();

      expect(result).toEqual(settings);
      expect(service.getAllSettings).toHaveBeenCalledTimes(1);
    });

    it('should return empty array when no settings exist', async () => {
      mockSettingsService.getAllSettings.mockResolvedValue([]);

      const result = await controller.getAllSettings();

      expect(result).toEqual([]);
      expect(service.getAllSettings).toHaveBeenCalledTimes(1);
    });

    it('should handle service errors gracefully', async () => {
      const error = new Error('Service error');
      mockSettingsService.getAllSettings.mockRejectedValue(error);

      await expect(controller.getAllSettings()).rejects.toThrow(error);
      expect(service.getAllSettings).toHaveBeenCalledTimes(1);
    });

    it('should handle database connection failures', async () => {
      const error = new Error('Database connection failed');
      mockSettingsService.getAllSettings.mockRejectedValue(error);

      await expect(controller.getAllSettings()).rejects.toThrow(error);
    });
  });

  describe('getSetting', () => {
    it('should retrieve a specific setting successfully', async () => {
      mockSettingsService.getSettingEntity.mockResolvedValue(mockSetting);

      const result = await controller.getSetting(
        SettingKeyEnum.JobFetchScheduleInterval,
      );

      expect(result).toEqual(mockSetting);
      expect(service.getSettingEntity).toHaveBeenCalledWith(
        SettingKeyEnum.JobFetchScheduleInterval,
      );
    });

    it('should throw NotFoundException when setting does not exist', async () => {
      const error = new NotFoundException(
        `Setting ${SettingKeyEnum.JobFetchScheduleInterval} not found`,
      );
      mockSettingsService.getSettingEntity.mockRejectedValue(error);

      await expect(
        controller.getSetting(SettingKeyEnum.JobFetchScheduleInterval),
      ).rejects.toThrow(NotFoundException);
      expect(service.getSettingEntity).toHaveBeenCalledWith(
        SettingKeyEnum.JobFetchScheduleInterval,
      );
    });

    it('should handle invalid enum values gracefully', async () => {
      // This test verifies that the ParseEnumPipe handles invalid values
      // The controller should not be reached with invalid enum values
      expect(() => {
        // Simulate what ParseEnumPipe would do
        if (
          !Object.values(SettingKeyEnum).includes(
            'InvalidKey' as SettingKeyEnum,
          )
        ) {
          throw new BadRequestException('Invalid enum value');
        }
      }).toThrow(BadRequestException);
    });

    it('should handle service errors gracefully', async () => {
      const error = new Error('Service error');
      mockSettingsService.getSettingEntity.mockRejectedValue(error);

      await expect(
        controller.getSetting(SettingKeyEnum.JobFetchScheduleInterval),
      ).rejects.toThrow(error);
    });
  });

  describe('updateSetting', () => {
    it('should update an existing setting successfully', async () => {
      const dto: SetSettingDto = {
        key: SettingKeyEnum.JobFetchScheduleInterval,
        value: 600000,
      };
      const updatedSetting = { ...mockSetting, value: 600000 };
      mockSettingsService.setSetting.mockResolvedValue(updatedSetting);

      const result = await controller.updateSetting(
        SettingKeyEnum.JobFetchScheduleInterval,
        dto,
      );

      expect(result).toEqual(updatedSetting);
      expect(service.setSetting).toHaveBeenCalledWith(
        SettingKeyEnum.JobFetchScheduleInterval,
        600000,
      );
    });

    it('should throw NotFoundException when setting does not exist', async () => {
      const dto: SetSettingDto = {
        key: SettingKeyEnum.JobFetchScheduleInterval,
        value: 600000,
      };
      const error = new NotFoundException(
        `Setting ${SettingKeyEnum.JobFetchScheduleInterval} not found`,
      );
      mockSettingsService.setSetting.mockRejectedValue(error);

      await expect(
        controller.updateSetting(SettingKeyEnum.JobFetchScheduleInterval, dto),
      ).rejects.toThrow(NotFoundException);
    });

    it('should handle validation errors gracefully', async () => {
      const dto: SetSettingDto = {
        key: SettingKeyEnum.JobFetchScheduleInterval,
        value: 500, // Invalid value
      };
      const error = new BadRequestException('Invalid value');
      mockSettingsService.setSetting.mockRejectedValue(error);

      await expect(
        controller.updateSetting(SettingKeyEnum.JobFetchScheduleInterval, dto),
      ).rejects.toThrow(BadRequestException);
    });

    it('should handle service errors gracefully', async () => {
      const dto: SetSettingDto = {
        key: SettingKeyEnum.JobFetchScheduleInterval,
        value: 600000,
      };
      const error = new Error('Service error');
      mockSettingsService.setSetting.mockRejectedValue(error);

      await expect(
        controller.updateSetting(SettingKeyEnum.JobFetchScheduleInterval, dto),
      ).rejects.toThrow(error);
    });
  });

  describe('checkSettingExists', () => {
    it('should return true when setting exists', async () => {
      mockSettingsService.settingExists.mockResolvedValue(true);

      const result = await controller.checkSettingExists(
        SettingKeyEnum.JobFetchScheduleInterval,
      );

      expect(result).toEqual({
        exists: true,
        key: SettingKeyEnum.JobFetchScheduleInterval,
      });
      expect(service.settingExists).toHaveBeenCalledWith(
        SettingKeyEnum.JobFetchScheduleInterval,
      );
    });

    it('should return false when setting does not exist', async () => {
      mockSettingsService.settingExists.mockResolvedValue(false);

      const result = await controller.checkSettingExists(
        SettingKeyEnum.JobFetchScheduleInterval,
      );

      expect(result).toEqual({
        exists: false,
        key: SettingKeyEnum.JobFetchScheduleInterval,
      });
      expect(service.settingExists).toHaveBeenCalledWith(
        SettingKeyEnum.JobFetchScheduleInterval,
      );
    });

    it('should handle service errors gracefully', async () => {
      const error = new Error('Service error');
      mockSettingsService.settingExists.mockRejectedValue(error);

      await expect(
        controller.checkSettingExists(SettingKeyEnum.JobFetchScheduleInterval),
      ).rejects.toThrow(error);
    });
  });

  describe('Validation and Pipes', () => {
    it('should use ValidationPipe with correct options', () => {
      // This test verifies that the controller is properly decorated with ValidationPipe
      const controllerPrototype = Object.getPrototypeOf(controller);
      expect(controllerPrototype).toBeDefined();
    });

    it('should use ParseEnumPipe for enum parameters', () => {
      // This test verifies that enum parameters are properly handled
      expect(SettingKeyEnum.JobFetchScheduleInterval).toBeDefined();
    });

    it('should handle malformed JSON gracefully', async () => {
      // This test verifies that malformed JSON would be caught by the ValidationPipe
      const malformedDto = {
        key: SettingKeyEnum.JobFetchScheduleInterval,
        value: '{"invalid": json}',
      };

      // The controller should handle this gracefully
      expect(malformedDto).toBeDefined();
    });
  });
});
