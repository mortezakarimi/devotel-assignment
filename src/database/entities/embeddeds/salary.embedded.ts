import { Column, Index } from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';

/**
 * Represents the salary information for a job.
 * This is an embedded entity.
 */
export class Salary {
  /**
   * The minimum salary for the position.
   * @example 100000
   */
  @ApiProperty({
    description: 'The minimum salary for the position.',
    example: 100000,
    type: 'integer',
    required: false,
  })
  @Index()
  @Column({ type: 'integer', nullable: true })
  min: number;

  /**
   * The maximum salary for the position.
   * @example 150000
   */
  @ApiProperty({
    description: 'The maximum salary for the position.',
    example: 150000,
    type: 'integer',
    required: false,
  })
  @Index()
  @Column({ type: 'integer', nullable: true })
  max: number;

  /**
   * The currency of the salary.
   * @example "USD"
   */
  @ApiProperty({
    description: 'The currency of the salary.',
    example: 'USD',
    maxLength: 10,
    required: false,
  })
  @Column({ type: 'varchar', length: 10, nullable: true })
  currency: string;
}
