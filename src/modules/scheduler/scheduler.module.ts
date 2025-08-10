import { Module } from '@nestjs/common';
import { SchedulerService } from './scheduler.service';
import { JobsModule } from '@/modules/jobs/jobs.module';
import { SchedulerController } from './scheduler.controller';

@Module({
  imports: [JobsModule],
  providers: [SchedulerService],
  controllers: [SchedulerController],
})
export class SchedulerModule {}
