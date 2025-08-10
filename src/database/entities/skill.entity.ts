import {
  Column,
  CreateDateColumn,
  Entity,
  ManyToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { JobEntity } from './job.entity';
import { ApiProperty } from '@nestjs/swagger';

/**
 * Represents a skill required for a job (e.g., "TypeScript", "NestJS").
 */
@Entity('skills')
export class SkillEntity {
  /**
   * The unique identifier for the skill.
   * @example 1
   */
  @ApiProperty({
    description: 'The unique identifier for the skill.',
    example: 1,
  })
  @PrimaryGeneratedColumn()
  id: number;

  /**
   * The name of the skill. Must be unique.
   * @example "TypeScript"
   */
  @ApiProperty({
    description: 'The name of the skill. Must be unique.',
    example: 'TypeScript',
    maxLength: 255,
  })
  @Column({ type: 'varchar', length: 255, unique: true })
  name: string;

  /**
   * The jobs that require this skill.
   * (This property is for the relation and not typically exposed in DTOs)
   */
  @ManyToMany(() => JobEntity, (job) => job.skills)
  jobs: JobEntity[];

  /**
   * The timestamp when the skill was created.
   */
  @ApiProperty({ description: 'The timestamp when the skill was created.' })
  @CreateDateColumn()
  createdAt: Date;

  /**
   * The timestamp when the skill was last updated.
   */
  @ApiProperty({
    description: 'The timestamp when the skill was last updated.',
  })
  @UpdateDateColumn()
  updatedAt: Date;

  constructor(name: string) {
    this.name = name;
  }
}
