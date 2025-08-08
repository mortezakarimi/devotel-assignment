import { Test, TestingModule } from '@nestjs/testing';
import { JobsService } from './jobs.service';
import { DatabaseModule } from '@/database/database.module';
import { getRepositoryToken, TypeOrmModule } from '@nestjs/typeorm';
import { JobEntity } from '@/database/entities/job.entity';
import { CompanyEntity } from '@/database/entities/company.entity';
import { SkillEntity } from '@/database/entities/skill.entity';
import { DataSource, Repository } from 'typeorm';
import { faker } from '@faker-js/faker';
import { JobTypeEnum } from '@/database/entities/enums/job-type.enum';

// Fixed seed for deterministic test data
faker.seed(123);

describe('JobsService', () => {
  let module: TestingModule;
  let service: JobsService;
  let jobRepository: Repository<JobEntity>;
  let companyRepository: Repository<CompanyEntity>;
  let skillRepository: Repository<SkillEntity>;
  let dataSource: DataSource;

  beforeAll(async () => {
    module = await Test.createTestingModule({
      imports: [
        // Use an in-memory SQLite database for testing
        TypeOrmModule.forRoot({
          type: 'sqlite',
          database: ':memory:',
          entities: [JobEntity, CompanyEntity, SkillEntity],
          synchronize: true, // Creates schema automatically. ONLY for testing!
          logging: false,
        }),
        // Assuming DatabaseModule exports the repositories
        DatabaseModule,
      ],
      providers: [JobsService],
    }).compile();

    service = module.get<JobsService>(JobsService);
    jobRepository = module.get<Repository<JobEntity>>(
      getRepositoryToken(JobEntity),
    );
    companyRepository = module.get<Repository<CompanyEntity>>(
      getRepositoryToken(CompanyEntity),
    );
    skillRepository = module.get<Repository<SkillEntity>>(
      getRepositoryToken(SkillEntity),
    );
    dataSource = module.get<DataSource>(DataSource);

    // Seed the database once for all tests in this suite
    await seedDatabase();
  });

  // Seeding logic extracted to a helper function
  async function seedDatabase() {
    const jobIds = faker.helpers.uniqueArray(
      () => faker.helpers.fromRegExp('job[0-9]{3}'),
      100,
    );
    for (const id of jobIds) {
      const website = faker.helpers.maybe(() => faker.internet.url());
      const company = companyRepository.create({
        name: faker.company.name(),
        website: website,
        industry:
          website === undefined ? faker.commerce.department() : undefined,
      });
      await companyRepository.save(company);

      const skillNames = faker.helpers.uniqueArray(
        () => faker.hacker.ingverb(),
        5,
      );

      const skills = await Promise.all(
        skillNames.map(async (name) => {
          const existingSkill = await skillRepository.findOneBy({ name });
          if (existingSkill) return existingSkill;
          const newSkill = skillRepository.create({ name });
          return skillRepository.save(newSkill);
        }),
      );

      const job = jobRepository.create({
        title: faker.person.jobTitle(),
        provider: { name: website ? 'Provider2' : 'Provider1', jobId: id },
        company,
        salary: {
          min: faker.number.int({ min: 1000, max: 10000 }),
          max: faker.number.int({ min: 10001, max: 100000 }),
          currency: faker.helpers.arrayElement(['USD', 'GBP', 'EUR']),
        },
        skills,
        location: {
          city: faker.location.city(),
          state: faker.location.state(),
        },
        experienceYears: faker.number.int({ min: 0, max: 15 }),
        isRemote: faker.helpers.arrayElement([true, false]),
        jobType: faker.helpers.maybe(() =>
          faker.helpers.enumValue(JobTypeEnum),
        ),
        postedDate: faker.date.recent({ days: 365 }),
      });
      await jobRepository.save(job);
    }
  }

  afterAll(async () => {
    await dataSource.destroy();
    await module.close();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should have seeded 100 jobs', async () => {
    const jobsCount = await jobRepository.count();
    expect(jobsCount).toBe(100);
  });
  //
  // // --- NEW TESTS FOR findAll ---
  // describe('findAll', () => {
  //   // Note: Default limit is assumed to be 20 for these tests
  //   const DEFAULT_LIMIT = 20;
  //
  //   // --- Pagination Tests ---
  //   describe('Pagination', () => {
  //     it('should return the first page with the default limit', async () => {
  //       const result = await service.findAll({});
  //       expect(result.items).toHaveLength(DEFAULT_LIMIT);
  //       expect(result.meta.totalItems).toBe(100);
  //       expect(result.meta.totalPages).toBe(100 / DEFAULT_LIMIT); // 5
  //       expect(result.meta.currentPage).toBe(1);
  //     });
  //
  //     it('should return the second page when requested', async () => {
  //       const result = await service.findAll({ page: 2, limit: 10 });
  //       expect(result.items).toHaveLength(10);
  //       expect(result.meta.currentPage).toBe(2);
  //       expect(result.meta.totalPages).toBe(10); // 100 items / 10 per page
  //     });
  //
  //     it('should return an empty array for a page out of bounds', async () => {
  //       const result = await service.findAll({ page: 99, limit: 10 });
  //       expect(result.items).toHaveLength(0);
  //       expect(result.meta.totalItems).toBe(100);
  //       expect(result.meta.currentPage).toBe(99);
  //     });
  //
  //     it('should default to page 1 for invalid page numbers', async () => {
  //       const resultPage0 = await service.findAll({ page: 0 });
  //       const resultNegativePage = await service.findAll({ page: -5 });
  //       expect(resultPage0.meta.currentPage).toBe(1);
  //       expect(resultNegativePage.meta.currentPage).toBe(1);
  //     });
  //   });
  //
  //   // --- Sorting Tests ---
  //   describe('Sorting', () => {
  //     it('should sort by postedDate in descending order by default', async () => {
  //       const { items } = await service.findAll({});
  //       const firstDate = new Date(items[0].postedDate);
  //       const secondDate = new Date(items[1].postedDate);
  //       expect(firstDate.getTime()).toBeGreaterThanOrEqual(
  //         secondDate.getTime(),
  //       );
  //     });
  //
  //     it('should sort by experienceYears in ascending order', async () => {
  //       const { items } = await service.findAll({
  //         sortBy: 'experienceYears',
  //         sortOrder: 'ASC',
  //       });
  //       expect(items[0].experienceYears).toBeLessThanOrEqual(
  //         items[1].experienceYears,
  //       );
  //     });
  //
  //     it('should sort by a nested property like salary.min', async () => {
  //       const { items } = await service.findAll({
  //         sortBy: 'salary.min',
  //         sortOrder: 'DESC',
  //       });
  //       expect(items[0].salary.min).toBeGreaterThanOrEqual(items[1].salary.min);
  //     });
  //   });
  //
  //   // --- Filtering Tests ---
  //   describe('Filtering', () => {
  //     it('should filter by a boolean property (isRemote)', async () => {
  //       const remoteJobsCount = await jobRepository.countBy({ isRemote: true });
  //       const result = await service.findAll({ filters: { isRemote: true } });
  //
  //       expect(result.meta.totalItems).toBe(remoteJobsCount);
  //       expect(result.items.every((job) => job.isRemote)).toBe(true);
  //     });
  //
  //     it('should filter by an enum property (jobType)', async () => {
  //       const jobType = JobTypeEnum.FullTime;
  //       const ftJobsCount = await jobRepository.countBy({ jobType });
  //       const result = await service.findAll({ filters: { jobType } });
  //
  //       expect(result.meta.totalItems).toBe(ftJobsCount);
  //       expect(result.items.every((job) => job.jobType === jobType)).toBe(true);
  //     });
  //
  //     it('should filter by a nested property (location.city)', async () => {
  //       // Find a city that actually exists in the seeded data
  //       const firstJob = await jobRepository.findOneBy({});
  //       const city = firstJob.location.city;
  //
  //       const cityJobsCount = await jobRepository.countBy({
  //         location: { city },
  //       });
  //       const result = await service.findAll({
  //         filters: { 'location.city': city },
  //       });
  //
  //       expect(result.meta.totalItems).toBe(cityJobsCount);
  //       expect(result.items.every((job) => job.location.city === city)).toBe(
  //         true,
  //       );
  //     });
  //
  //     it('should filter by related entity (skills)', async () => {
  //       // Find a skill that actually exists and is used
  //       const skillToFind = await skillRepository.findOne({
  //         where: { name: 'synthesize' }, // This skill is generated by the fixed seed
  //       });
  //       const query = {
  //         where: { skills: { id: skillToFind.id } },
  //       } as FindManyOptions<JobEntity>;
  //       const jobsWithSkillCount = await jobRepository.count(query);
  //
  //       const result = await service.findAll({
  //         filters: { 'skills.name': skillToFind.name },
  //       });
  //
  //       expect(result.meta.totalItems).toBe(jobsWithSkillCount);
  //       expect(result.meta.totalItems).toBeGreaterThan(0); // Ensure we found some
  //     });
  //
  //     it('should return no results for a filter with no matches', async () => {
  //       const result = await service.findAll({
  //         filters: { title: 'NonExistentTitle' },
  //       });
  //       expect(result.meta.totalItems).toBe(0);
  //       expect(result.items).toHaveLength(0);
  //     });
  //   });
  //
  //   // --- Combined Tests ---
  //   describe('Combined Pagination, Sorting, and Filtering', () => {
  //     it('should correctly apply all options at once', async () => {
  //       const filter = { isRemote: false, jobType: JobTypeEnum.PartTime };
  //       const ptNonRemoteCount = await jobRepository.countBy(filter);
  //
  //       const result = await service.findAll({
  //         page: 1,
  //         limit: 5,
  //         sortBy: 'experienceYears',
  //         sortOrder: 'DESC',
  //         filters: filter,
  //       });
  //
  //       // Verify Pagination
  //       expect(result.items.length).toBeLessThanOrEqual(5);
  //       expect(result.meta.totalItems).toBe(ptNonRemoteCount);
  //       expect(result.meta.currentPage).toBe(1);
  //
  //       // Verify Filtering
  //       expect(result.items.every((j) => !j.isRemote)).toBe(true);
  //       expect(
  //         result.items.every((j) => j.jobType === JobTypeEnum.PartTime),
  //       ).toBe(true);
  //
  //       // Verify Sorting
  //       if (result.items.length > 1) {
  //         expect(result.items[0].experienceYears).toBeGreaterThanOrEqual(
  //           result.items[1].experienceYears,
  //         );
  //       }
  //     });
  //   });
  // });
});
