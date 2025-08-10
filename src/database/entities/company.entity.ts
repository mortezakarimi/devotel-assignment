import {
  Column,
  CreateDateColumn,
  Entity,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { JobEntity } from './job.entity';
import { ApiProperty } from '@nestjs/swagger';

/**
 * Represents a company that posts jobs.
 */
@Entity('companies')
export class CompanyEntity {
  /**
   * The unique identifier for the company.
   * @example 1
   */
  @ApiProperty({
    description: 'The unique identifier for the company.',
    example: 1,
  })
  @PrimaryGeneratedColumn()
  id: number;

  /**
   * The name of the company. Must be unique.
   * @example "Google"
   */
  @ApiProperty({
    description: 'The name of the company. Must be unique.',
    example: 'Google',
    maxLength: 255,
  })
  @Column({ type: 'varchar', length: 255, unique: true })
  name: string;

  /**
   * The industry the company belongs to.
   * @example "Technology"
   */
  @ApiProperty({
    description: 'The industry the company belongs to.',
    example: 'Technology',
    required: false,
    maxLength: 255,
  })
  @Column({ type: 'varchar', length: 255, nullable: true })
  industry?: string | null;

  /**
   * The official website of the company.
   * @example "https://www.google.com"
   */
  @ApiProperty({
    description: 'The official website of the company.',
    example: 'https://www.google.com',
    required: false,
    maxLength: 255,
  })
  @Column({ type: 'varchar', length: 255, nullable: true })
  website?: string | null;

  /**
   * The list of jobs associated with this company.
   * (This property is for the relation and not typically exposed in DTOs)
   */
  @OneToMany(() => JobEntity, (job) => job.company)
  jobs: JobEntity[];

  /**
   * The timestamp when the company was created.
   */
  @ApiProperty({ description: 'The timestamp when the company was created.' })
  @CreateDateColumn()
  createdAt: Date;

  /**
   * The timestamp when the company was last updated.
   */
  @ApiProperty({
    description: 'The timestamp when the company was last updated.',
  })
  @UpdateDateColumn()
  updatedAt: Date;
}
