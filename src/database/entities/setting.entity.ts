import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { SettingKeyEnum } from '@/database/entities/enums/setting-key.enum';
import { ApiProperty } from '@nestjs/swagger';

/**
 * Represents a key-value pair for application settings.
 */
@Entity('settings')
export class SettingEntity {
  /**
   * The unique identifier for the setting.
   * @example 1
   */
  @ApiProperty({
    description: 'The unique identifier for the setting.',
    example: 1,
  })
  @PrimaryGeneratedColumn()
  id: number;

  /**
   * The unique key for the setting.
   */
  @ApiProperty({
    description: 'The unique key for the setting.',
    enum: SettingKeyEnum,
    example: SettingKeyEnum.JobFetchScheduleInterval,
  })
  @Column({
    type: 'simple-enum',
    enum: SettingKeyEnum,
    unique: true,
  })
  key: SettingKeyEnum;

  /**
   * The value of the setting, stored as JSON.
   * The structure depends on the key.
   * @example { "cron": "0 0 * * *" }
   */
  @ApiProperty({
    description: 'The value of the setting, stored as JSON.',
    example: { cron: '0 0 * * *' },
    required: false,
  })
  @Column({
    type: 'jsonb',
    nullable: true,
  })
  value: any;

  /**
   * The timestamp when the setting was created.
   */
  @ApiProperty({ description: 'The timestamp when the setting was created.' })
  @CreateDateColumn()
  createdAt: Date;

  /**
   * The timestamp when the setting was last updated.
   */
  @ApiProperty({
    description: 'The timestamp when the setting was last updated.',
  })
  @UpdateDateColumn()
  updatedAt: Date;
}
