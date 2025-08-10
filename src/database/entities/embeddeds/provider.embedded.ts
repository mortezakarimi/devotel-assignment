import { Column, Index } from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';

/**
 * Represents the external source or platform from which a job was sourced.
 * This is an embedded entity.
 */
export class Provider {
  /**
   * The name of the external job provider.
   * @example "LinkedIn"
   */
  @ApiProperty({
    description: 'The name of the external job provider.',
    example: 'LinkedIn',
  })
  @Index()
  @Column()
  name: string;

  /**
   * The unique identifier for the job on the provider's platform.
   * @example "123456789"
   */
  @ApiProperty({
    description:
      "The unique identifier for the job on the provider's platform.",
    example: '123456789',
  })
  @Index()
  @Column()
  jobId: string;
}
