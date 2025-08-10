import { Column, Index } from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';

/**
 * Represents the geographical location for a job or company.
 * This is an embedded entity and does not have its own table.
 */
export class Location {
  /**
   * The city where the job is located.
   * @example "Mountain View"
   */
  @ApiProperty({
    description: 'The city where the job is located.',
    example: 'Mountain View',
    required: false,
  })
  @Index()
  @Column({ nullable: true })
  city: string;

  /**
   * The state or province where the job is located.
   * @example "CA"
   */
  @ApiProperty({
    description: 'The state or province where the job is located.',
    example: 'CA',
    required: false,
  })
  @Index()
  @Column({ nullable: true })
  state: string;
}
