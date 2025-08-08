import { Test, TestingModule } from '@nestjs/testing';
import { JobsController } from './jobs.controller';
import { JobsService } from '@/modules/jobs/jobs.service';
import { DatabaseModule } from '@/database/database.module';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JobEntity } from '@/database/entities/job.entity';
import { CompanyEntity } from '@/database/entities/company.entity';
import { SkillEntity } from '@/database/entities/skill.entity';

describe('JobsController', () => {
  let controller: JobsController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [
        TypeOrmModule.forRoot({
          type: 'sqlite',
          database: ':memory:', // In-memory database
          entities: [JobEntity, CompanyEntity, SkillEntity], // Add all entities used in the test
          synchronize: true, // Auto-creates schema. ONLY for testing!
          logging: false, // Disable logging for cleaner test output
        }),
        DatabaseModule,
      ],
      controllers: [JobsController],
      providers: [JobsService],
    }).compile();

    controller = module.get<JobsController>(JobsController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
