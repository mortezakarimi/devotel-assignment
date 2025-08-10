import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken, TypeOrmModule } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { faker } from '@faker-js/faker';

// --- Module and Entity Imports
import { JobsService } from './jobs.service';
import { DatabaseModule } from '@/database/database.module';
import { JobEntity } from '@/database/entities/job.entity';
import { CompanyEntity } from '@/database/entities/company.entity';
import { SkillEntity } from '@/database/entities/skill.entity';
import { JobTypeEnum } from '@/database/entities/enums/job-type.enum';
import { DeepPartial } from '@/common';
import { ProvidersService } from '@/providers/providers.service';

describe('JobsService', () => {
  let service: JobsService;
  let jobRepository: Repository<JobEntity>;
  let companyRepository: Repository<CompanyEntity>;
  let skillRepository: Repository<SkillEntity>;
  let dataSource: DataSource;
  let module: TestingModule;

  // --- Test Setup: In-memory database and module compilation
  beforeAll(async () => {
    module = await Test.createTestingModule({
      imports: [
        TypeOrmModule.forRoot({
          type: 'sqlite',
          database: ':memory:',
          entities: [JobEntity, CompanyEntity, SkillEntity],
          synchronize: true, // Auto-create schema for tests.
          dropSchema: true, // Drops schema on connection close.
        }),
        DatabaseModule, // Assuming this provides the repositories.
      ],
      providers: [
        JobsService,
        {
          provide: ProvidersService,
          useValue: {
            load: jest.fn().mockResolvedValue([]),
          },
        },
      ],
    }).compile();

    // --- Retrieve services and repositories from the testing module
    service = module.get<JobsService>(JobsService);
    dataSource = module.get<DataSource>(DataSource);
    jobRepository = module.get<Repository<JobEntity>>(
      getRepositoryToken(JobEntity),
    );
    companyRepository = module.get<Repository<CompanyEntity>>(
      getRepositoryToken(CompanyEntity),
    );
    skillRepository = module.get<Repository<SkillEntity>>(
      getRepositoryToken(SkillEntity),
    );
  });

  // --- Test Teardown: Clean database after each test for isolation
  afterEach(async () => {
    // Clearing repositories ensures tests are independent.
    await jobRepository.clear();
    await companyRepository.clear();
    await skillRepository.clear();
  });

  // --- Final Teardown: Close database connection and module
  afterAll(async () => {
    await dataSource.destroy();
    await module.close();
  });

  // --- Helper function to create test data with sensible defaults
  const createTestJob = async (
    overrides: DeepPartial<JobEntity> = {},
  ): Promise<JobEntity> => {
    // Create company if provided or use default
    let company: CompanyEntity;
    if (overrides.company) {
      company = await companyRepository.save(
        companyRepository.create({
          name: faker.company.name(),
          ...(overrides.company as DeepPartial<CompanyEntity>),
        }),
      );
    } else {
      company = await companyRepository.save(
        companyRepository.create({
          name: faker.company.name(),
        }),
      );
    }

    const jobData = {
      title: faker.person.jobTitle(),
      provider: { name: 'TestProvider', jobId: faker.string.uuid() },
      postedDate: faker.date.recent({ days: 30 }),
      isRemote: false,
      experienceYears: 2,
      salary: { min: 50000, max: 80000, currency: 'USD' },
      location: { city: 'New York', state: 'NY' },
      jobType: JobTypeEnum.FullTime,
      company: company,
      skills: [],
      ...overrides,
    };
    return jobRepository.save(jobRepository.create(jobData));
  };

  // --- Basic Sanity Check
  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  // --- Main Test Suite for the `findAll` method
  describe('findAll()', () => {
    const DEFAULT_LIMIT = 20; // Assuming the service has a default limit of 20.

    // --- Pagination Tests
    describe('Pagination', () => {
      // Seed 25 jobs to test pagination logic thoroughly.
      beforeEach(async () => {
        const jobs = Array.from({ length: 25 }, () => createTestJob());
        await Promise.all(jobs);
      });

      it('should return the first page with the default limit', async () => {
        const { data: items, meta } = await service.findAll({ path: '/' });

        expect(items).toHaveLength(DEFAULT_LIMIT);
        expect(meta.totalItems).toBe(25);
        expect(meta.itemsPerPage).toBe(DEFAULT_LIMIT);
        expect(meta.totalPages).toBe(Math.ceil(25 / DEFAULT_LIMIT)); // Should be 2
        expect(meta.currentPage).toBe(1);
      });

      it('should return the correct page and limit when specified', async () => {
        const { data: items, meta } = await service.findAll({
          page: 2,
          limit: 10,
          path: '/',
        });

        expect(items).toHaveLength(10);
        expect(meta.totalItems).toBe(25);
        expect(meta.totalPages).toBe(3);
        expect(meta.currentPage).toBe(2);
      });

      it('should return the remaining items on the last page', async () => {
        const { data: items, meta } = await service.findAll({
          page: 3,
          limit: 10,
          path: '/',
        });

        expect(items).toHaveLength(5);
        expect(meta.currentPage).toBe(3);
      });

      it('should return an empty array for a page that is out of bounds', async () => {
        const { data: items, meta } = await service.findAll({
          page: 99,
          path: '/',
        });

        expect(items).toHaveLength(0);
        expect(meta.totalItems).toBe(25);
        expect(meta.currentPage).toBe(99);
      });

      it('should default to page 1 for invalid page numbers (e.g., 0, negative)', async () => {
        const resultPage0 = await service.findAll({ page: 0, path: '/' });
        const resultNegativePage = await service.findAll({
          page: -5,
          path: '/',
        });

        expect(resultPage0.meta.currentPage).toBe(1);
        expect(resultNegativePage.meta.currentPage).toBe(1);
      });
    });

    // --- Sorting Tests
    describe('Sorting', () => {
      let jobOldest: JobEntity;
      let jobNewest: JobEntity;
      let jobMid: JobEntity;

      // Create specific, predictable data for sorting assertions.
      beforeEach(async () => {
        jobNewest = await createTestJob({ postedDate: new Date('2025-08-08') });
        jobMid = await createTestJob({ postedDate: new Date('2025-08-05') });
        jobOldest = await createTestJob({ postedDate: new Date('2025-08-01') });
      });

      it('should sort by postedDate in descending order by default', async () => {
        const { data: items } = await service.findAll({ path: '/' });

        expect(items.map((j) => j.id)).toEqual([
          jobNewest.id,
          jobMid.id,
          jobOldest.id,
        ]);
      });

      it('should sort by a specified column in ascending order', async () => {
        const jobLowExp = await createTestJob({ experienceYears: 2 });
        const jobHighExp = await createTestJob({ experienceYears: 10 });

        const { data: items } = await service.findAll({
          sortBy: [['experienceYears', 'ASC']],
          path: '/',
        });

        // Find the specific jobs in the result for a precise assertion.
        const relevantJobs = items.filter((j) =>
          [jobLowExp.id, jobHighExp.id].includes(j.id),
        );
        expect(relevantJobs[0].experienceYears).toBeLessThanOrEqual(
          relevantJobs[1].experienceYears!,
        );
      });

      it('should sort correctly on a nested property (e.g., salary.min)', async () => {
        const jobLowSalary = await createTestJob({
          salary: { min: 30000, max: 50000, currency: 'USD' },
        });
        const jobHighSalary = await createTestJob({
          salary: { min: 90000, max: 120000, currency: 'USD' },
        });

        const { data: items } = await service.findAll({
          sortBy: [['salary.min', 'DESC']],
          path: '/',
        });

        const relevantJobs = items.filter((j) =>
          [jobLowSalary.id, jobHighSalary.id].includes(j.id),
        );
        expect(relevantJobs[0].id).toBe(jobHighSalary.id);
        expect(relevantJobs[1].id).toBe(jobLowSalary.id);
      });

      it('should revert to default sorting for an invalid sortBy key', async () => {
        const { data: items } = await service.findAll({
          sortBy: [['invalidKey', 'DESC']],
          path: '/',
        });

        // Expect the default sort order (postedDate DESC).
        expect(items.map((j) => j.id)).toEqual([
          jobNewest.id,
          jobMid.id,
          jobOldest.id,
        ]);
      });
    });

    // --- Filtering Tests
    describe('Filtering', () => {
      it('should filter by a boolean property (isRemote)', async () => {
        const remoteJob = await createTestJob({ isRemote: true });
        await createTestJob({ isRemote: false }); // Office job

        const { data: items, meta } = await service.findAll({
          filter: { isRemote: '1' },
          path: '/',
        });

        expect(meta.totalItems).toBe(1);
        expect(items[0].id).toBe(remoteJob.id);
      });

      it('should filter by an enum property (jobType)', async () => {
        const partTimeJob = await createTestJob({
          jobType: JobTypeEnum.PartTime,
        });
        await createTestJob({ jobType: JobTypeEnum.FullTime });

        const { data: items, meta } = await service.findAll({
          filter: { jobType: JobTypeEnum.PartTime },
          path: '/',
        });

        expect(meta.totalItems).toBe(1);
        expect(items[0].id).toBe(partTimeJob.id);
      });

      it('should filter by a nested property (location.city)', async () => {
        const laJob = await createTestJob({
          location: { city: 'Los Angeles' },
        });
        await createTestJob({ location: { city: 'San Francisco' } });

        const { data: items, meta } = await service.findAll({
          filter: { 'location.city': 'Los Angeles' },
          path: '/',
        });

        expect(meta.totalItems).toBe(1);
        expect(items[0].id).toBe(laJob.id);
      });

      it('should filter by a many-to-many relationship (skills.name)', async () => {
        const skillReact = await skillRepository.save({ name: 'React' });
        const skillNode = await skillRepository.save({ name: 'Node.js' });

        const reactJob = await createTestJob({ skills: [skillReact] });
        await createTestJob({ skills: [skillNode] });

        const { data: items, meta } = await service.findAll({
          filter: { 'skills.name': 'React' },
          path: '/',
        });

        expect(meta.totalItems).toBe(1);
        expect(items[0].id).toBe(reactJob.id);
      });

      it('should return no results for a filter with no matches', async () => {
        await createTestJob({ title: 'Software Engineer' });

        const { data: items, meta } = await service.findAll({
          filter: { title: 'NonExistentTitle' },
          path: '/',
        });

        expect(meta.totalItems).toBe(0);
        expect(items).toHaveLength(0);
      });
    });

    // --- Combined Operations Tests
    describe('Combined Pagination, Sorting, and Filtering', () => {
      it('should correctly apply all options simultaneously', async () => {
        // --- Setup a predictable dataset
        await createTestJob({
          isRemote: true,
          jobType: JobTypeEnum.FullTime,
          experienceYears: 5,
        });
        const targetJob1 = await createTestJob({
          isRemote: false,
          jobType: JobTypeEnum.PartTime,
          experienceYears: 10,
        });
        const targetJob2 = await createTestJob({
          isRemote: false,
          jobType: JobTypeEnum.PartTime,
          experienceYears: 3,
        });
        await createTestJob({
          isRemote: false,
          jobType: JobTypeEnum.FullTime,
          experienceYears: 8,
        });

        // --- Execute the query
        const { data: items, meta } = await service.findAll({
          page: 1,
          limit: 5,
          sortBy: [['experienceYears', 'DESC']],
          filter: { isRemote: '0', jobType: JobTypeEnum.PartTime },
          path: '/',
        });

        // --- Assert the results
        // Meta should reflect the filtered count
        expect(meta.totalItems).toBe(2);
        expect(meta.itemsPerPage).toBe(5);
        expect(meta.currentPage).toBe(1);

        // Items should be the two matching jobs
        expect(items).toHaveLength(2);

        // Items should be sorted correctly
        expect(items.map((j) => j.id)).toEqual([targetJob1.id, targetJob2.id]);
      });
    });

    describe('Filtering', () => {
      it('should filter by a boolean property (isRemote)', async () => {
        const remoteJob = await createTestJob({ isRemote: true });
        await createTestJob({ isRemote: false }); // Office job

        const { data: items, meta } = await service.findAll({
          filter: { isRemote: '1' },
          path: '/',
        });

        expect(meta.totalItems).toBe(1);
        expect(items[0].id).toBe(remoteJob.id);
      });

      it('should filter by an enum property (jobType)', async () => {
        const partTimeJob = await createTestJob({
          jobType: JobTypeEnum.PartTime,
        });
        await createTestJob({ jobType: JobTypeEnum.FullTime });

        const { data: items, meta } = await service.findAll({
          filter: { jobType: JobTypeEnum.PartTime },
          path: '/',
        });

        expect(meta.totalItems).toBe(1);
        expect(items[0].id).toBe(partTimeJob.id);
      });

      it('should filter by a nested property in an embedded entity (location.city)', async () => {
        const laJob = await createTestJob({
          location: { city: 'Los Angeles' },
        });
        await createTestJob({ location: { city: 'San Francisco' } });

        const { data: items, meta } = await service.findAll({
          filter: { 'location.city': 'Los Angeles' },
          path: '/',
        });

        expect(meta.totalItems).toBe(1);
        expect(items[0].id).toBe(laJob.id);
      });

      // --- NEW TEST CASE ADDED HERE ---
      it('should filter by a property on a related ManyToOne entity (company.name)', async () => {
        // --- Setup: Create two distinct companies and associate jobs with them.
        const companyA = await companyRepository.save(
          companyRepository.create({ name: 'Innovate Inc.' }),
        );
        const companyB = await companyRepository.save(
          companyRepository.create({ name: 'Synergy Corp.' }),
        );

        const jobWithCompanyA = await createTestJob({ company: companyA });
        await createTestJob({ company: companyB });

        // --- Execute: Filter by the name of the related company.
        const { data: items, meta } = await service.findAll({
          filter: { 'company.name': 'Innovate Inc.' },
          path: '/',
        });

        // --- Assert: Only the job from Innovate Inc. should be returned.
        expect(meta.totalItems).toBe(1);
        expect(items).toHaveLength(1);
        expect(items[0].id).toBe(jobWithCompanyA.id);
        expect(items[0].company.name).toBe('Innovate Inc.');
      });

      it('should filter by a property on a related ManyToMany entity (skills.name)', async () => {
        const skillReact = await skillRepository.save({ name: 'React' });
        const skillNode = await skillRepository.save({ name: 'Node.js' });

        const reactJob = await createTestJob({ skills: [skillReact] });
        await createTestJob({ skills: [skillNode] });

        const { data: items, meta } = await service.findAll({
          filter: { 'skills.name': 'React' },
          path: '/',
        });

        expect(meta.totalItems).toBe(1);
        expect(items[0].id).toBe(reactJob.id);
      });

      it('should return no results for a filter with no matches', async () => {
        await createTestJob({ title: 'Software Engineer' });

        const { data: items, meta } = await service.findAll({
          filter: { title: 'NonExistentTitle' },
          path: '/',
        });

        expect(meta.totalItems).toBe(0);
        expect(items).toHaveLength(0);
      });

      it('should handle empty filters object', async () => {
        const job = await createTestJob();

        const { data: items, meta } = await service.findAll({
          filter: {},
          path: '/',
        });

        expect(meta.totalItems).toBeGreaterThan(0);
        expect(items.length).toBeGreaterThan(0);
        expect(items.some((item) => item.id === job.id)).toBeTruthy();
      });

      it('should handle filtering by a non-nested property with relation filters', async () => {
        // Create a skill to force the query builder approach
        const skillReact = await skillRepository.save({ name: 'React' });

        // Create a job with a specific title and the React skill
        const targetJob = await createTestJob({
          title: 'Frontend Developer',
          skills: [skillReact],
        });

        // Create another job with a different title and the same skill
        await createTestJob({
          title: 'Backend Developer',
          skills: [skillReact],
        });

        // Filter by both the skill name (relation filter) and title (non-relation filter)
        const { data: items, meta } = await service.findAll({
          filter: {
            'skills.name': 'React',
            title: 'Frontend Developer',
          },
          path: '/',
        });

        expect(meta.totalItems).toBe(1);
        expect(items).toHaveLength(1);
        expect(items[0].id).toBe(targetJob.id);
      });

      it('should handle sorting with empty sortBy field', async () => {
        const jobNewest = await createTestJob({
          postedDate: new Date('2025-08-08'),
        });
        const jobMid = await createTestJob({
          postedDate: new Date('2025-08-05'),
        });
        const jobOldest = await createTestJob({
          postedDate: new Date('2025-08-01'),
        });

        const { data: items } = await service.findAll({
          sortBy: [['', '']],
          path: '/',
        });

        // Should default to postedDate DESC
        expect(items.map((j) => j.id)).toEqual([
          jobNewest.id,
          jobMid.id,
          jobOldest.id,
        ]);
      });

      it('should handle relation filters with default sorting', async () => {
        // Create a skill to force the query builder approach
        const skillReact = await skillRepository.save({ name: 'React' });

        // Create jobs with different posted dates and the React skill
        const jobNewest = await createTestJob({
          postedDate: new Date('2025-08-08'),
          skills: [skillReact],
        });

        const jobOldest = await createTestJob({
          postedDate: new Date('2025-08-01'),
          skills: [skillReact],
        });

        // Filter by skill name and use default sorting
        const { data: items } = await service.findAll({
          filter: { 'skills.name': 'React' },
          path: '/',
        });

        expect(items).toHaveLength(2);
        expect(items[0].id).toBe(jobNewest.id);
        expect(items[1].id).toBe(jobOldest.id);
      });

      it('should handle only relation filters with no regular filters', async () => {
        // Create a skill to force the query builder approach
        const skillReact = await skillRepository.save({ name: 'React' });
        const skillNode = await skillRepository.save({ name: 'Node.js' });

        // Create a job with React skill
        const reactJob = await createTestJob({
          skills: [skillReact],
        });

        // Create a job with Node.js skill
        await createTestJob({
          skills: [skillNode],
        });

        // Filter by skill name only
        const { data: items } = await service.findAll({
          filter: { 'skills.name': 'React' },
          path: '/',
        });

        expect(items).toHaveLength(1);
        expect(items[0].id).toBe(reactJob.id);
      });

      it('should handle sorting by a regular property with query builder approach', async () => {
        // Create a skill to force the query builder approach
        const skillReact = await skillRepository.save({ name: 'React' });

        // Create jobs with different titles and the React skill
        const jobA = await createTestJob({
          title: 'A Developer',
          skills: [skillReact],
        });

        const jobZ = await createTestJob({
          title: 'Z Developer',
          skills: [skillReact],
        });

        // Filter by skill name and sort by title
        const { data: items } = await service.findAll({
          filter: { 'skills.name': 'React' },
          sortBy: [['title', 'ASC']],
          path: '/',
        });

        expect(items).toHaveLength(2);
        expect(items[0].id).toBe(jobA.id);
        expect(items[1].id).toBe(jobZ.id);
      });

      it('should handle sorting by a nested property with query builder approach', async () => {
        // Create jobs with different salary minimums but no skills to avoid query builder approach
        // This will test the standard repository approach which can handle nested sorting
        const jobLowSalary = await createTestJob({
          salary: { min: 30000, max: 50000, currency: 'USD' },
        });

        const jobHighSalary = await createTestJob({
          salary: { min: 90000, max: 120000, currency: 'USD' },
        });

        // Sort by salary.min without relation filters to use repository approach
        const { data: items } = await service.findAll({
          sortBy: [['salary.min', 'ASC']],
          path: '/',
        });

        expect(items).toHaveLength(2);
        expect(items[0].id).toBe(jobLowSalary.id);
        expect(items[1].id).toBe(jobHighSalary.id);
      });

      it('should handle nested property sorting with query builder approach', async () => {
        // Create a skill to force the query builder approach
        const skillReact = await skillRepository.save({ name: 'React' });

        // Create jobs with different titles and the React skill
        const jobA = await createTestJob({
          title: 'A Job',
          skills: [skillReact],
        });

        const jobB = await createTestJob({
          title: 'B Job',
          skills: [skillReact],
        });

        // Filter by skill name and sort by title
        const { data: items } = await service.findAll({
          filter: { 'skills.name': 'React' },
          sortBy: [['title', 'ASC']],
          path: '/',
        });

        expect(items).toHaveLength(2);
        expect(items[0].id).toBe(jobA.id);
        expect(items[1].id).toBe(jobB.id);
      });

      it('should handle invalid sortBy with query builder approach', async () => {
        // Create a skill to force the query builder approach
        const skillReact = await skillRepository.save({ name: 'React' });

        // Create jobs with different posted dates and the React skill
        const jobNewest = await createTestJob({
          postedDate: new Date('2025-08-08'),
          skills: [skillReact],
        });

        const jobOldest = await createTestJob({
          postedDate: new Date('2025-08-01'),
          skills: [skillReact],
        });

        // Filter by skill name and use invalid sortBy
        const { data: items } = await service.findAll({
          filter: { 'skills.name': 'React' },
          sortBy: [['invalidField', 'DESC']],
          path: '/',
        });

        // Should default to postedDate DESC
        expect(items).toHaveLength(2);
        expect(items[0].id).toBe(jobNewest.id);
        expect(items[1].id).toBe(jobOldest.id);
      });
    });
  });

  // --- Main Test Suite for the `load` method
  describe('load()', () => {
    let mockProvidersService: jest.Mocked<ProvidersService>;

    beforeEach(() => {
      // Get the mocked providers service
      mockProvidersService = module.get(ProvidersService);
    });

    it('should load jobs from providers and save them to database', async () => {
      // Mock data that would come from providers
      const mockJobsFromProviders: DeepPartial<JobEntity>[] = [
        {
          id: undefined, // New job, no ID yet
          title: 'Software Engineer',
          provider: { name: 'Provider1', jobId: 'job1' },
          postedDate: new Date('2024-01-01'),
          isRemote: true,
          experienceYears: 3,
          salary: { min: 80000, max: 120000, currency: 'USD' },
          location: { city: 'San Francisco', state: 'CA' },
          jobType: JobTypeEnum.FullTime,
          company: { id: undefined, name: 'Tech Corp Inc.' },
          skills: [
            { id: undefined, name: 'JavaScript' },
            { id: undefined, name: 'React' },
          ],
        },
        {
          id: undefined,
          title: 'Product Manager',
          provider: { name: 'Provider2', jobId: 'job2' },
          postedDate: new Date('2024-01-02'),
          isRemote: false,
          experienceYears: 5,
          salary: { min: 100000, max: 150000, currency: 'USD' },
          location: { city: 'New York', state: 'NY' },
          jobType: JobTypeEnum.FullTime,
          company: { id: undefined, name: 'Innovation Labs' },
          skills: [
            { id: undefined, name: 'Product Strategy' },
            { id: undefined, name: 'Agile' },
          ],
        },
      ];

      // Mock the providers service to return our test data
      mockProvidersService.load.mockResolvedValue(
        mockJobsFromProviders as JobEntity[],
      );

      // Execute the load method
      const result = await service.load();

      // Verify the result
      expect(result).toHaveLength(2);
      expect(result[0].title).toBe('Software Engineer');
      expect(result[1].title).toBe('Product Manager');

      // Verify that jobs were saved to the database
      const savedJobs = await jobRepository.find({
        relations: ['company', 'skills'],
      });
      expect(savedJobs).toHaveLength(2);

      // Verify companies were created
      const companies = await companyRepository.find();
      expect(companies).toHaveLength(2);
      expect(companies.map((c) => c.name)).toContain('Tech Corp Inc.');
      expect(companies.map((c) => c.name)).toContain('Innovation Labs');

      // Verify skills were created
      const skills = await skillRepository.find();
      expect(skills).toHaveLength(4);
      expect(skills.map((s) => s.name)).toContain('JavaScript');
      expect(skills.map((s) => s.name)).toContain('React');
      expect(skills.map((s) => s.name)).toContain('Product Strategy');
      expect(skills.map((s) => s.name)).toContain('Agile');
    });

    it('should reuse existing companies when loading jobs', async () => {
      // Create an existing company
      const existingCompany = await companyRepository.save({
        name: 'Existing Tech Corp',
      });

      const mockJobsFromProviders: DeepPartial<JobEntity>[] = [
        {
          id: undefined,
          title: 'Developer',
          provider: { name: 'Provider1', jobId: 'job1' },
          postedDate: new Date('2024-01-01'),
          isRemote: false,
          experienceYears: 2,
          salary: { min: 60000, max: 80000, currency: 'USD' },
          location: { city: 'Austin', state: 'TX' },
          jobType: JobTypeEnum.FullTime,
          company: { id: undefined, name: 'Existing Tech Corp' }, // Same name as existing
          skills: [{ id: undefined, name: 'Python' }],
        },
      ];

      mockProvidersService.load.mockResolvedValue(
        mockJobsFromProviders as JobEntity[],
      );

      const result = await service.load();

      // Verify the job was saved
      expect(result).toHaveLength(1);
      expect(result[0].company.id).toBe(existingCompany.id);

      // Verify no new company was created
      const companies = await companyRepository.find();
      expect(companies).toHaveLength(1);
      expect(companies[0].id).toBe(existingCompany.id);
    });

    it('should reuse existing skills when loading jobs', async () => {
      // Create existing skills
      const existingSkill1 = await skillRepository.save({ name: 'JavaScript' });
      const existingSkill2 = await skillRepository.save({ name: 'React' });

      const mockJobsFromProviders: DeepPartial<JobEntity>[] = [
        {
          id: undefined,
          title: 'Full Stack Developer',
          provider: { name: 'Provider1', jobId: 'job1' },
          postedDate: new Date('2024-01-01'),
          isRemote: true,
          experienceYears: 4,
          salary: { min: 90000, max: 130000, currency: 'USD' },
          location: { city: 'Seattle', state: 'WA' },
          jobType: JobTypeEnum.FullTime,
          company: { id: undefined, name: 'New Company' },
          skills: [
            { id: undefined, name: 'JavaScript' }, // Existing skill
            { id: undefined, name: 'React' }, // Existing skill
            { id: undefined, name: 'Node.js' }, // New skill
          ],
        },
      ];

      mockProvidersService.load.mockResolvedValue(
        mockJobsFromProviders as JobEntity[],
      );

      const result = await service.load();

      // Verify the job was saved
      expect(result).toHaveLength(1);
      expect(result[0].skills).toHaveLength(3);

      // Verify existing skills were reused
      const jobSkills = result[0].skills;
      const javascriptSkill = jobSkills.find((s) => s.name === 'JavaScript');
      const reactSkill = jobSkills.find((s) => s.name === 'React');
      const nodeSkill = jobSkills.find((s) => s.name === 'Node.js');

      expect(javascriptSkill?.id).toBe(existingSkill1.id);
      expect(reactSkill?.id).toBe(existingSkill2.id);
      expect(nodeSkill?.id).not.toBeUndefined();
      expect(nodeSkill?.id).not.toBe(existingSkill1.id);
      expect(nodeSkill?.id).not.toBe(existingSkill2.id);

      // Verify total skills count (should be 3, not 6)
      const allSkills = await skillRepository.find();
      expect(allSkills).toHaveLength(3);
    });

    it('should handle jobs with no skills', async () => {
      const mockJobsFromProviders: DeepPartial<JobEntity>[] = [
        {
          id: undefined,
          title: 'Intern',
          provider: { name: 'Provider1', jobId: 'job1' },
          postedDate: new Date('2024-01-01'),
          isRemote: false,
          experienceYears: 0,
          salary: { min: 20000, max: 30000, currency: 'USD' },
          location: { city: 'Chicago', state: 'IL' },
          jobType: JobTypeEnum.PartTime,
          company: { id: undefined, name: 'Startup Inc.' },
          skills: [], // No skills
        },
      ];

      mockProvidersService.load.mockResolvedValue(
        mockJobsFromProviders as JobEntity[],
      );

      const result = await service.load();

      expect(result).toHaveLength(1);
      expect(result[0].skills).toHaveLength(0);
      expect(result[0].title).toBe('Intern');
    });

    it('should handle jobs with no company information', async () => {
      const mockJobsFromProviders: DeepPartial<JobEntity>[] = [
        {
          id: undefined,
          title: 'Contractor',
          provider: { name: 'Provider1', jobId: 'job1' },
          postedDate: new Date('2024-01-01'),
          isRemote: true,
          experienceYears: 7,
          salary: { min: 120000, max: 180000, currency: 'USD' },
          location: { city: 'Remote', state: 'Remote' },
          jobType: JobTypeEnum.Contract,
          company: { id: undefined, name: 'Unknown Company' },
          skills: [{ id: undefined, name: 'DevOps' }],
        },
      ];

      mockProvidersService.load.mockResolvedValue(
        mockJobsFromProviders as JobEntity[],
      );

      const result = await service.load();

      expect(result).toHaveLength(1);
      expect(result[0].company.name).toBe('Unknown Company');

      // Verify company was created
      const companies = await companyRepository.find();
      expect(companies).toHaveLength(1);
      expect(companies[0].name).toBe('Unknown Company');
    });

    it('should preserve all job properties when saving', async () => {
      const mockJobsFromProviders: DeepPartial<JobEntity>[] = [
        {
          id: undefined,
          title: 'Senior Developer',
          provider: { name: 'Provider1', jobId: 'job1' },
          postedDate: new Date('2024-01-01'),
          isRemote: true,
          experienceYears: 8,
          salary: { min: 150000, max: 200000, currency: 'USD' },
          location: { city: 'Portland', state: 'OR' },
          jobType: JobTypeEnum.FullTime,
          company: { id: undefined, name: 'Big Tech Corp' },
          skills: [{ id: undefined, name: 'TypeScript' }],
        },
      ];

      mockProvidersService.load.mockResolvedValue(
        mockJobsFromProviders as JobEntity[],
      );

      const result = await service.load();

      expect(result).toHaveLength(1);
      const savedJob = result[0];

      // Verify all properties were preserved
      expect(savedJob.title).toBe('Senior Developer');
      expect(savedJob.provider.name).toBe('Provider1');
      expect(savedJob.provider.jobId).toBe('job1');
      expect(savedJob.postedDate).toEqual(new Date('2024-01-01'));
      expect(savedJob.isRemote).toBe(true);
      expect(savedJob.experienceYears).toBe(8);
      expect(savedJob.salary.min).toBe(150000);
      expect(savedJob.salary.max).toBe(200000);
      expect(savedJob.salary.currency).toBe('USD');
      expect(savedJob.location.city).toBe('Portland');
      expect(savedJob.location.state).toBe('OR');
      expect(savedJob.jobType).toBe(JobTypeEnum.FullTime);
    });

    it('should handle multiple jobs with the same company', async () => {
      const mockJobsFromProviders: DeepPartial<JobEntity>[] = [
        {
          id: undefined,
          title: 'Frontend Developer',
          provider: { name: 'Provider1', jobId: 'job1' },
          postedDate: new Date('2024-01-01'),
          isRemote: false,
          experienceYears: 3,
          salary: { min: 80000, max: 100000, currency: 'USD' },
          location: { city: 'Boston', state: 'MA' },
          jobType: JobTypeEnum.FullTime,
          company: { id: undefined, name: 'Shared Company' },
          skills: [{ id: undefined, name: 'Vue.js' }],
        },
        {
          id: undefined,
          title: 'Backend Developer',
          provider: { name: 'Provider2', jobId: 'job2' },
          postedDate: new Date('2024-01-02'),
          isRemote: false,
          experienceYears: 4,
          salary: { min: 90000, max: 110000, currency: 'USD' },
          location: { city: 'Boston', state: 'MA' },
          jobType: JobTypeEnum.FullTime,
          company: { id: undefined, name: 'Shared Company' }, // Same company
          skills: [{ id: undefined, name: 'Java' }],
        },
      ];

      mockProvidersService.load.mockResolvedValue(
        mockJobsFromProviders as JobEntity[],
      );

      const result = await service.load();

      expect(result).toHaveLength(2);

      // Verify both jobs reference the same company
      expect(result[0].company.id).toBe(result[1].company.id);
      expect(result[0].company.name).toBe('Shared Company');
      expect(result[1].company.name).toBe('Shared Company');

      // Verify only one company was created
      const companies = await companyRepository.find();
      expect(companies).toHaveLength(1);
    });

    it('should handle multiple jobs with overlapping skills', async () => {
      const mockJobsFromProviders: DeepPartial<JobEntity>[] = [
        {
          id: undefined,
          title: 'React Developer',
          provider: { name: 'Provider1', jobId: 'job1' },
          postedDate: new Date('2024-01-01'),
          isRemote: true,
          experienceYears: 2,
          salary: { min: 70000, max: 90000, currency: 'USD' },
          location: { city: 'Denver', state: 'CO' },
          jobType: JobTypeEnum.FullTime,
          company: { id: undefined, name: 'Tech Startup' },
          skills: [
            { id: undefined, name: 'React' },
            { id: undefined, name: 'JavaScript' },
          ],
        },
        {
          id: undefined,
          title: 'Full Stack Developer',
          provider: { name: 'Provider2', jobId: 'job2' },
          postedDate: new Date('2024-01-02'),
          isRemote: true,
          experienceYears: 5,
          salary: { min: 100000, max: 130000, currency: 'USD' },
          location: { city: 'Miami', state: 'FL' },
          jobType: JobTypeEnum.FullTime,
          company: { id: undefined, name: 'Another Startup' },
          skills: [
            { id: undefined, name: 'React' }, // Overlapping skill
            { id: undefined, name: 'Node.js' }, // New skill
          ],
        },
      ];

      mockProvidersService.load.mockResolvedValue(
        mockJobsFromProviders as JobEntity[],
      );

      const result = await service.load();

      expect(result).toHaveLength(2);

      // Verify skills were created correctly
      const allSkills = await skillRepository.find();
      expect(allSkills).toHaveLength(3); // React, JavaScript, Node.js

      // Verify both jobs reference the same React skill instance
      const reactSkill = allSkills.find((s) => s.name === 'React');
      expect(reactSkill).toBeDefined();
      expect(result[0].skills.find((s) => s.name === 'React')?.id).toBe(
        reactSkill?.id,
      );
      expect(result[1].skills.find((s) => s.name === 'React')?.id).toBe(
        reactSkill?.id,
      );
    });

    it('should throw an error if providers service fails', async () => {
      const errorMessage = 'Failed to connect to provider';
      mockProvidersService.load.mockRejectedValue(new Error(errorMessage));

      await expect(service.load()).rejects.toThrow(
        'An error occurred while loading jobs.',
      );
    });

    it('should handle empty array from providers', async () => {
      mockProvidersService.load.mockResolvedValue([]);

      const result = await service.load();

      expect(result).toHaveLength(0);

      // Verify no entities were created
      const jobs = await jobRepository.find();
      const companies = await companyRepository.find();
      const skills = await skillRepository.find();

      expect(jobs).toHaveLength(0);
      expect(companies).toHaveLength(0);
      expect(skills).toHaveLength(0);
    });

    it('should handle database errors gracefully', async () => {
      const mockJobsFromProviders: DeepPartial<JobEntity>[] = [
        {
          id: undefined,
          title: 'Developer',
          provider: { name: 'Provider1', jobId: 'job1' },
          postedDate: new Date('2024-01-01'),
          isRemote: false,
          experienceYears: 2,
          salary: { min: 60000, max: 80000, currency: 'USD' },
          location: { city: 'Austin', state: 'TX' },
          jobType: JobTypeEnum.FullTime,
          company: { id: undefined, name: 'Test Company' },
          skills: [{ id: undefined, name: 'Python' }],
        },
      ];

      mockProvidersService.load.mockResolvedValue(
        mockJobsFromProviders as JobEntity[],
      );

      // Mock a database error by making the save method throw
      jest
        .spyOn(jobRepository, 'save')
        .mockRejectedValueOnce(new Error('Database connection failed'));

      await expect(service.load()).rejects.toThrow(
        'An error occurred while loading jobs.',
      );
    });
  });
});
