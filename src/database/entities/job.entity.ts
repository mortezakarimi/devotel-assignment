import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinTable,
  ManyToMany,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { CompanyEntity } from './company.entity';
import { SkillEntity } from './skill.entity';
import { Salary } from '@/database/entities/embeddeds/salary.embedded';
import { Location } from '@/database/entities/embeddeds/location.embedded';
import { Provider } from '@/database/entities/embeddeds/provider.embedded';
import { JobTypeEnum } from '@/database/entities/enums/job-type.enum';
import * as common from '@/common';
import { ApiProperty } from '@nestjs/swagger';

/**
 * Represents a job posting.
 * The combination of provider name and provider job ID must be unique.
 */
@Entity('jobs')
@Index(['provider.name', 'provider.jobId'], { unique: true })
export class JobEntity {
  /**
   * The unique identifier for the job in our system.
   * @example 1
   */
  @ApiProperty({
    description: 'The unique identifier for the job.',
    example: 1,
  })
  @PrimaryGeneratedColumn()
  id?: number;

  /**
   * Information about the external source of this job posting.
   */
  @ApiProperty({
    description: 'Information about the external source of this job posting.',
    type: () => Provider,
  })
  @Column(() => Provider)
  provider: Provider;

  /**
   * The title of the job.
   * @example "Senior Software Engineer"
   */
  @ApiProperty({
    description: 'The title of the job.',
    example: 'Senior Software Engineer',
  })
  @Column()
  title: string;

  /**
   * Indicates if the job is fully remote.
   * @example true
   */
  @ApiProperty({
    description: 'Indicates if the job is fully remote.',
    example: true,
    default: false,
  })
  @Column({ default: false })
  isRemote: boolean;

  /**
   * The type of employment for the job (e.g., Full-Time, Contract).
   */
  @ApiProperty({
    description: 'The type of employment for the job.',
    enum: JobTypeEnum,
    example: JobTypeEnum.FullTime,
    required: false,
  })
  @Index()
  @Column({
    type: 'simple-enum',
    enum: JobTypeEnum,
    nullable: true,
  })
  jobType?: JobTypeEnum | null;

  /**
   * The geographical location of the job.
   */
  @ApiProperty({
    description: 'The geographical location of the job.',
    type: () => Location,
  })
  @Column(() => Location)
  location: Location;

  /**
   * The salary range for the job.
   */
  @ApiProperty({
    description: 'The salary range for the job.',
    type: () => Salary,
  })
  @Column(() => Salary)
  salary: Salary;

  /**
   * The required years of experience for the position.
   * @example 5
   */
  @ApiProperty({
    description: 'The required years of experience for the position.',
    example: 5,
    type: 'integer',
    required: false,
  })
  @Column({ type: 'int2', nullable: true })
  experienceYears: number | null;

  /**
   * The date the job was originally posted by the provider.
   */
  @ApiProperty({
    description: 'The date the job was originally posted by the provider.',
    type: 'string',
    format: 'date-time',
    required: false,
  })
  @Column({ nullable: true })
  postedDate: Date;

  /**
   * The company that posted the job.
   */
  @ApiProperty({
    description: 'The company that posted the job.',
    type: () => CompanyEntity,
  })
  @ManyToOne(() => CompanyEntity, (company) => company.jobs, { eager: true })
  company: CompanyEntity;

  /**
   * The list of skills associated with the job.
   */
  @ApiProperty({
    description: 'The list of skills associated with the job.',
    type: () => [SkillEntity],
  })
  @ManyToMany(() => SkillEntity, (skill) => skill.jobs, {
    cascade: false,
    eager: true,
  })
  @JoinTable({
    name: 'job_skills',
    joinColumn: { name: 'job_id', referencedColumnName: 'id' },
    inverseJoinColumn: { name: 'skill_id', referencedColumnName: 'id' },
  })
  skills: SkillEntity[];

  /**
   * The timestamp when the job was created in our system.
   */
  @ApiProperty({
    description: 'The timestamp when the job was created in our system.',
  })
  @CreateDateColumn()
  createdAt: Date;

  /**
   * The timestamp when the job was last updated in our system.
   */
  @ApiProperty({
    description: 'The timestamp when the job was last updated in our system.',
  })
  @UpdateDateColumn()
  updatedAt: Date;

  constructor(partial?: common.DeepPartial<JobEntity>) {
    Object.assign(this, partial);
  }
}
