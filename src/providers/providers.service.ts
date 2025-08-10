import { Injectable } from '@nestjs/common';
import { Provider1Service } from '@/providers/provider1/provider1.service';
import { Provider2Service } from '@/providers/provider2/provider2.service';
import { JobEntity } from '@/database/entities/job.entity';

@Injectable()
export class ProvidersService {
  constructor(
    private readonly provider1Service: Provider1Service,
    private readonly provider2Service: Provider2Service,
  ) {}

  async load(): Promise<JobEntity[]> {
    return [
      ...(await this.provider1Service.load()),
      ...(await this.provider2Service.load()),
    ];
  }
}
