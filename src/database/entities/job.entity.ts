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

// Full-Time, Part-Time,Contract
@Entity('jobs')
@Index(['provider.name', 'provider.jobId'], { unique: true })
export class JobEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column(() => Provider)
  provider: Provider;

  @Column()
  title: string;

  @Column({ default: false })
  isRemote: boolean;

  @Index()
  @Column({
    type: 'simple-enum',
    enum: JobTypeEnum,
    nullable: true,
  })
  jobType?: JobTypeEnum | null;

  @Column(() => Location)
  location: Location;

  @Column(() => Salary)
  salary: Salary;

  @Column({ type: 'int2', nullable: true })
  experienceYears: number | null;

  @Column({ nullable: true })
  postedDate: Date;

  @ManyToOne(() => CompanyEntity, (company) => company.jobs, { eager: true }) // eager loads the company
  company: CompanyEntity;

  @ManyToMany(() => SkillEntity, (skill) => skill.jobs, {
    cascade: true,
    eager: true,
  })
  @JoinTable({
    name: 'job_skills',
    joinColumn: { name: 'job_id', referencedColumnName: 'id' },
    inverseJoinColumn: { name: 'skill_id', referencedColumnName: 'id' },
  })
  skills: SkillEntity[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  constructor(partial?: common.DeepPartial<JobEntity>) {
    Object.assign(this, partial);
  }
}
