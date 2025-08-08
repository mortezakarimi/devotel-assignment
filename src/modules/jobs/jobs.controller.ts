import { Controller } from '@nestjs/common';
import { JobsService } from '@/modules/jobs/jobs.service';

@Controller('jobs-offers')
export class JobsController {
  constructor(private jobService: JobsService) {}
}
