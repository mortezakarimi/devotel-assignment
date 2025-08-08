import { Injectable } from '@nestjs/common';
import { Repository } from 'typeorm';
import { JobEntity } from '@/database/entities/job.entity';
import { InjectRepository } from '@nestjs/typeorm';

@Injectable()
export class JobsService {
  constructor(
    @InjectRepository(JobEntity)
    private readonly jobRepository: Repository<JobEntity>,
  ) {}
}
