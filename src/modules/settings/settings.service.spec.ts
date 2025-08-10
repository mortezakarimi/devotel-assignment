import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { SettingsService } from './settings.service';
import { SettingEntity } from '@/database/entities/setting.entity';
import { SettingKeyEnum } from '@/database/entities/enums/setting-key.enum';

describe('SettingsService', () => {
  let service: SettingsService;
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  let repository: Repository<SettingEntity>;

  const mockRepository = {
    findOneBy: jest.fn(),
    save: jest.fn(),
    create: jest.fn(),
    find: jest.fn(),
    delete: jest.fn(),
    countBy: jest.fn(),
  };

  let mockSetting: SettingEntity = {
    id: 1,
    key: SettingKeyEnum.JobFetchScheduleInterval,
    value: 300000,
    createdAt: new Date('2024-01-15T10:30:00.000Z'),
    updatedAt: new Date('2024-01-15T10:30:00.000Z'),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SettingsService,
        {
          provide: getRepositoryToken(SettingEntity),
          useValue: mockRepository,
        },
      ],
    }).compile();

    service = module.get<SettingsService>(SettingsService);
    repository = module.get<Repository<SettingEntity>>(
      getRepositoryToken(SettingEntity),
    );
    mockSetting = {
      id: 1,
      key: SettingKeyEnum.JobFetchScheduleInterval,
      value: 300000,
      createdAt: new Date('2024-01-15T10:30:00.000Z'),
      updatedAt: new Date('2024-01-15T10:30:00.000Z'),
    };
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getSetting', () => {
    it('should retrieve a setting value successfully', async () => {
      mockRepository.findOneBy.mockResolvedValue(mockSetting);

      const result = await service.getSetting(
        SettingKeyEnum.JobFetchScheduleInterval,
      );

      expect(result).toBe(300000);
      expect(mockRepository.findOneBy).toHaveBeenCalledWith({
        key: SettingKeyEnum.JobFetchScheduleInterval,
      });
    });

    it('should return null when setting is not found', async () => {
      mockRepository.findOneBy.mockResolvedValue(null);

      const result = await service.getSetting(
        SettingKeyEnum.JobFetchScheduleInterval,
      );

      expect(result).toBeNull();
      expect(mockRepository.findOneBy).toHaveBeenCalledWith({
        key: SettingKeyEnum.JobFetchScheduleInterval,
      });
    });

    it('should handle repository errors gracefully', async () => {
      const error = new Error('Database connection failed');
      mockRepository.findOneBy.mockRejectedValue(error);

      await expect(
        service.getSetting(SettingKeyEnum.JobFetchScheduleInterval),
      ).rejects.toThrow(error);
    });

    it('should handle different value types correctly', async () => {
      const stringSetting = { ...mockSetting, value: 'test-string' };
      const booleanSetting = { ...mockSetting, value: true };
      const objectSetting = { ...mockSetting, value: { interval: 300000 } };

      mockRepository.findOneBy.mockResolvedValueOnce(stringSetting);
      let result: any = await service.getSetting<string>(
        SettingKeyEnum.JobFetchScheduleInterval,
      );
      expect(result).toBe('test-string');

      mockRepository.findOneBy.mockResolvedValueOnce(booleanSetting);
      result = await service.getSetting<boolean>(
        SettingKeyEnum.JobFetchScheduleInterval,
      );
      expect(result).toBe(true);

      mockRepository.findOneBy.mockResolvedValueOnce(objectSetting);
      result = await service.getSetting<{ interval: number }>(
        SettingKeyEnum.JobFetchScheduleInterval,
      );
      expect(result).toEqual({ interval: 300000 });
    });
  });

  describe('getSettingEntity', () => {
    it('should retrieve a setting entity successfully', async () => {
      mockRepository.findOneBy.mockResolvedValue(mockSetting);

      const result = await service.getSettingEntity(
        SettingKeyEnum.JobFetchScheduleInterval,
      );

      expect(result).toEqual(mockSetting);
      expect(mockRepository.findOneBy).toHaveBeenCalledWith({
        key: SettingKeyEnum.JobFetchScheduleInterval,
      });
    });

    it('should throw NotFoundException when setting is not found', async () => {
      mockRepository.findOneBy.mockResolvedValue(null);

      await expect(
        service.getSettingEntity(SettingKeyEnum.JobFetchScheduleInterval),
      ).rejects.toThrow(NotFoundException);
      expect(mockRepository.findOneBy).toHaveBeenCalledWith({
        key: SettingKeyEnum.JobFetchScheduleInterval,
      });
    });

    it('should handle repository errors gracefully', async () => {
      const error = new Error('Database connection failed');
      mockRepository.findOneBy.mockRejectedValue(error);
      await expect(
        service.getSettingEntity(SettingKeyEnum.JobFetchScheduleInterval),
      ).rejects.toThrow(error);
    });
  });

  describe('setSetting', () => {
    it('should update an existing setting successfully', async () => {
      const updatedSetting = { ...mockSetting, value: 600000 };
      mockRepository.findOneBy.mockResolvedValue(mockSetting);
      mockRepository.save.mockResolvedValue(updatedSetting);

      const result = await service.setSetting(
        SettingKeyEnum.JobFetchScheduleInterval,
        600000,
      );

      expect(result).toEqual(updatedSetting);
      expect(mockRepository.findOneBy).toHaveBeenCalledWith({
        key: SettingKeyEnum.JobFetchScheduleInterval,
      });
      expect(mockRepository.save).toHaveBeenCalledWith({
        ...mockSetting,
        value: 600000,
      });
    });

    it('should throw NotFoundException when setting does not exist', async () => {
      mockRepository.findOneBy.mockResolvedValue(null);

      await expect(
        service.setSetting(SettingKeyEnum.JobFetchScheduleInterval, 600000),
      ).rejects.toThrow(NotFoundException);
      expect(mockRepository.findOneBy).toHaveBeenCalledWith({
        key: SettingKeyEnum.JobFetchScheduleInterval,
      });
      expect(mockRepository.save).not.toHaveBeenCalled();
    });

    it('should validate JobFetchScheduleInterval value range', async () => {
      // Test minimum value
      await expect(
        service.setSetting(SettingKeyEnum.JobFetchScheduleInterval, 500),
      ).rejects.toThrow(BadRequestException);

      // Test maximum value
      await expect(
        service.setSetting(SettingKeyEnum.JobFetchScheduleInterval, 90000000),
      ).rejects.toThrow(BadRequestException);

      // Test valid values
      mockRepository.findOneBy.mockResolvedValue(mockSetting);
      mockRepository.save.mockResolvedValue(mockSetting);

      await expect(
        service.setSetting(SettingKeyEnum.JobFetchScheduleInterval, 10000),
      ).resolves.toBeDefined();
      await expect(
        service.setSetting(SettingKeyEnum.JobFetchScheduleInterval, 86400000),
      ).resolves.toBeDefined();
    });

    it('should validate JobFetchScheduleInterval value type', async () => {
      await expect(
        service.setSetting(SettingKeyEnum.JobFetchScheduleInterval, 'invalid'),
      ).rejects.toThrow(BadRequestException);

      await expect(
        service.setSetting(SettingKeyEnum.JobFetchScheduleInterval, true),
      ).rejects.toThrow(BadRequestException);

      await expect(
        service.setSetting(SettingKeyEnum.JobFetchScheduleInterval, {}),
      ).rejects.toThrow(BadRequestException);
    });

    it('should handle repository save errors gracefully', async () => {
      const error = new Error('Save operation failed');
      mockRepository.findOneBy.mockResolvedValue(mockSetting);
      mockRepository.save.mockRejectedValue(error);

      await expect(
        service.setSetting(SettingKeyEnum.JobFetchScheduleInterval, 600000),
      ).rejects.toThrow(error);
    });
  });

  describe('getAllSettings', () => {
    it('should retrieve all settings successfully', async () => {
      const settings = [
        mockSetting,
        { ...mockSetting, id: 2, key: SettingKeyEnum.JobFetchScheduleInterval },
      ];
      mockRepository.find.mockResolvedValue(settings);

      const result = await service.getAllSettings();

      expect(result).toEqual(settings);
      expect(mockRepository.find).toHaveBeenCalledWith({
        order: { key: 'ASC' },
      });
    });

    it('should return empty array when no settings exist', async () => {
      mockRepository.find.mockResolvedValue([]);

      const result = await service.getAllSettings();

      expect(result).toEqual([]);
      expect(mockRepository.find).toHaveBeenCalledWith({
        order: { key: 'ASC' },
      });
    });

    it('should handle repository errors gracefully', async () => {
      const error = new Error('Database connection failed');
      mockRepository.find.mockRejectedValue(error);

      await expect(service.getAllSettings()).rejects.toThrow(error);
    });
  });

  describe('settingExists', () => {
    it('should return true when setting exists', async () => {
      mockRepository.countBy.mockResolvedValue(1);

      const result = await service.settingExists(
        SettingKeyEnum.JobFetchScheduleInterval,
      );

      expect(result).toBe(true);
      expect(mockRepository.countBy).toHaveBeenCalledWith({
        key: SettingKeyEnum.JobFetchScheduleInterval,
      });
    });

    it('should return false when setting does not exist', async () => {
      mockRepository.countBy.mockResolvedValue(0);

      const result = await service.settingExists(
        SettingKeyEnum.JobFetchScheduleInterval,
      );

      expect(result).toBe(false);
      expect(mockRepository.countBy).toHaveBeenCalledWith({
        key: SettingKeyEnum.JobFetchScheduleInterval,
      });
    });

    it('should handle repository errors gracefully', async () => {
      const error = new Error('Count operation failed');
      mockRepository.countBy.mockRejectedValue(error);

      await expect(
        service.settingExists(SettingKeyEnum.JobFetchScheduleInterval),
      ).rejects.toThrow(error);
    });
  });

  describe('validateSettingValue', () => {
    it('should validate JobFetchScheduleInterval correctly', () => {
      // Valid values
      expect(() =>
        service['validateSettingValue'](
          SettingKeyEnum.JobFetchScheduleInterval,
          10000,
        ),
      ).not.toThrow();
      expect(() =>
        service['validateSettingValue'](
          SettingKeyEnum.JobFetchScheduleInterval,
          300000,
        ),
      ).not.toThrow();
      expect(() =>
        service['validateSettingValue'](
          SettingKeyEnum.JobFetchScheduleInterval,
          86400000,
        ),
      ).not.toThrow();

      // Invalid values
      expect(() =>
        service['validateSettingValue'](
          SettingKeyEnum.JobFetchScheduleInterval,
          500,
        ),
      ).toThrow(BadRequestException);
      expect(() =>
        service['validateSettingValue'](
          SettingKeyEnum.JobFetchScheduleInterval,
          90000000,
        ),
      ).toThrow(BadRequestException);
      expect(() =>
        service['validateSettingValue'](
          SettingKeyEnum.JobFetchScheduleInterval,
          'invalid',
        ),
      ).toThrow(BadRequestException);
      expect(() =>
        service['validateSettingValue'](
          SettingKeyEnum.JobFetchScheduleInterval,
          true,
        ),
      ).toThrow(BadRequestException);
    });

    it('should handle unknown setting keys gracefully', () => {
      // Should not throw for valid values with unknown keys
      expect(() =>
        service['validateSettingValue'](
          'UnknownKey' as SettingKeyEnum,
          'valid-value',
        ),
      ).not.toThrow();
      expect(() =>
        service['validateSettingValue']('UnknownKey' as SettingKeyEnum, 123),
      ).not.toThrow();
      expect(() =>
        service['validateSettingValue']('UnknownKey' as SettingKeyEnum, true),
      ).not.toThrow();

      // Should throw for undefined/null values
      expect(() =>
        service['validateSettingValue'](
          'UnknownKey' as SettingKeyEnum,
          undefined,
        ),
      ).toThrow(BadRequestException);
      expect(() =>
        service['validateSettingValue']('UnknownKey' as SettingKeyEnum, null),
      ).toThrow(BadRequestException);
    });
  });

  describe('Edge Cases and Error Handling', () => {
    it('should handle very large numbers correctly', async () => {
      const largeValue = Number.MAX_SAFE_INTEGER;
      mockRepository.findOneBy.mockResolvedValue(mockSetting);
      mockRepository.save.mockResolvedValue({
        ...mockSetting,
        value: largeValue,
      });

      const result = await service.setSetting(
        'XYZ' as SettingKeyEnum,
        largeValue,
      );
      expect(result.value).toBe(largeValue);
    });

    it('should handle zero values correctly', async () => {
      await expect(
        service.setSetting(SettingKeyEnum.JobFetchScheduleInterval, 0),
      ).rejects.toThrow(BadRequestException);
    });

    it('should handle negative values correctly', async () => {
      await expect(
        service.setSetting(SettingKeyEnum.JobFetchScheduleInterval, -1000),
      ).rejects.toThrow(BadRequestException);
    });

    it('should handle floating point numbers correctly', async () => {
      await expect(
        service.setSetting(SettingKeyEnum.JobFetchScheduleInterval, 1000.5),
      ).rejects.toThrow(BadRequestException);
    });

    it('should handle concurrent operations gracefully', async () => {
      // Simulate concurrent read operations
      mockRepository.findOneBy.mockResolvedValue(mockSetting);

      const results = await Promise.all([
        service.getSetting(SettingKeyEnum.JobFetchScheduleInterval),
        service.getSetting(SettingKeyEnum.JobFetchScheduleInterval),
        service.getSetting(SettingKeyEnum.JobFetchScheduleInterval),
      ]);
      expect(results).toEqual([300000, 300000, 300000]);
      expect(mockRepository.findOneBy).toHaveBeenCalledTimes(3);
    });

    it('should handle database transaction failures', async () => {
      const error = new Error('Transaction failed');
      mockRepository.findOneBy.mockResolvedValue(mockSetting);
      mockRepository.save.mockRejectedValue(error);

      await expect(
        service.setSetting(SettingKeyEnum.JobFetchScheduleInterval, 600000),
      ).rejects.toThrow(error);
    });
  });
});
