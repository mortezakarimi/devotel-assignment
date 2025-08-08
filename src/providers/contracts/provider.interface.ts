import { JobEntity } from '@/database/entities/job.entity';

export default interface IProvider<ProviderData, JobData> {
  fetch(): Promise<ProviderData>;
  load(): Promise<JobEntity[]>;
  toJob(data: JobData): JobEntity;
  fromJob(data: JobEntity): JobData;
}
