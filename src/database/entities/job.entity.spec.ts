import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken, TypeOrmModule } from '@nestjs/typeorm';
import { DataSource, QueryFailedError, Repository } from 'typeorm';
import { DatabaseModule } from '@/database/database.module';
// Entities and Enums to be tested
import { JobEntity } from '@/database/entities/job.entity';
import { CompanyEntity } from '@/database/entities/company.entity';
import { SkillEntity } from '@/database/entities/skill.entity';

describe('JobEntity - Integration', () => {
  // Module and Repository references
  let module: TestingModule;
  let dataSource: DataSource;
  let jobRepository: Repository<JobEntity>;
  let companyRepository: Repository<CompanyEntity>;
  let skillRepository: Repository<SkillEntity>;

  beforeAll(async () => {
    // Initialize the NestJS testing module
    module = await Test.createTestingModule({
      imports: [
        // Use the existing DatabaseModule which should handle TypeOrmModule.forFeature
        DatabaseModule,
        // Override the database connection for testing purposes
        // This setup creates a new, isolated in-memory SQLite database for each test run
        TypeOrmModule.forRoot({
          type: 'sqlite',
          database: ':memory:',
          entities: [JobEntity, CompanyEntity, SkillEntity],
          synchronize: true, // Automatically creates the DB schema. Use ONLY for tests.
          logging: false, // Keep test output clean
        }),
      ],
    }).compile();

    // Get instances of the repositories and the DataSource from the module
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

  // Before each test, wipe the tables to ensure a clean state and test isolation
  beforeEach(async () => {
    // CORRECT WAY: Use .clear() to remove all records from a table in tests.
    // .delete({}) is disallowed by TypeORM for safety.
    await jobRepository.clear();
    await skillRepository.clear();
    await companyRepository.clear();
  });

  // After all tests have completed, destroy the database connection
  afterAll(async () => {
    await dataSource.destroy();
    await module.close();
  });

  describe('when creating a job', () => {
    it('should correctly save and retrieve a job with all its relations', async () => {
      // --- ARRANGE ---
      const company = await companyRepository.save({
        name: 'Stark Industries',
      });
      const skill1 = skillRepository.create({ name: 'TypeScript' });
      const skill2 = skillRepository.create({ name: 'GraphQL' });
      await skillRepository.save([skill1, skill2]);
      const newJobData: Partial<JobEntity> = {
        title: 'Senior Software Engineer',
        provider: { name: 'ProviderX', jobId: 'px-123' },
        company: company,
        skills: [skill1, skill2],
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-expect-error
        location: {},
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-expect-error
        salary: {},
      };
      const newJob = jobRepository.create(newJobData);

      // --- ACT ---
      await jobRepository.save(newJob);
      const foundJob = await jobRepository.findOne({
        where: { id: newJob.id },
        relations: { company: true, skills: true },
      });

      // --- ASSERT ---
      expect(foundJob).toBeDefined();
      expect(foundJob?.title).toBe('Senior Software Engineer');
      expect(foundJob?.company.name).toBe('Stark Industries');
      expect(foundJob?.skills).toHaveLength(2);
      expect(foundJob?.skills).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ name: 'TypeScript' }),
          expect.objectContaining({ name: 'GraphQL' }),
        ]),
      );
    });

    it('should successfully create a job without a company', async () => {
      // --- ARRANGE ---
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-expect-error
      const jobData = jobRepository.create({
        title: 'Freelance Developer',
        provider: { name: 'Upwork', jobId: 'up-456' },
        company: null, // Explicitly no company
        location: {},
        salary: {},
      });

      // --- ACT ---
      await jobRepository.save(jobData);
      const foundJob = await jobRepository.findOne({
        where: { id: jobData.id },
        relations: { company: true },
      });

      // --- ASSERT ---
      expect(foundJob).toBeDefined();
      expect(foundJob?.title).toBe('Freelance Developer');
      expect(foundJob?.company).toBeNull();
    });

    it('should successfully create a job without any skills', async () => {
      // --- ARRANGE ---
      const jobData = jobRepository.create({
        title: 'Entry Level Position',
        provider: { name: 'Glassdoor', jobId: 'gd-789' },
        skills: [], // Empty array for skills
        location: {},
        salary: {},
      });

      // --- ACT ---
      await jobRepository.save(jobData);
      const foundJob = await jobRepository.findOne({
        where: { id: jobData.id },
        relations: { skills: true },
      });

      // --- ASSERT ---
      expect(foundJob).toBeDefined();
      expect(foundJob?.title).toBe('Entry Level Position');
      expect(foundJob?.skills).toBeDefined();
      expect(foundJob?.skills).toHaveLength(0);
    });
  });

  describe('when enforcing validation and constraints', () => {
    it('should fail if a job with the same provider and providerJobId already exists', async () => {
      // --- ARRANGE ---
      const initialJob = jobRepository.create({
        title: 'First Job',
        provider: { name: 'Indeed', jobId: 'unique-id-123' },
        location: {},
        salary: {},
      });
      await jobRepository.save(initialJob);

      const duplicateJob = jobRepository.create({
        title: 'Duplicate Job',
        provider: { name: 'Indeed', jobId: 'unique-id-123' },
        location: {},
        salary: {},
      });

      // --- ACT & ASSERT ---
      await expect(jobRepository.save(duplicateJob)).rejects.toThrow(
        QueryFailedError,
      );
    });

    it('should fail if the title is null', async () => {
      // --- ARRANGE ---
      const jobWithNullTitle = jobRepository.create({
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-expect-error
        title: null, // Invalid state
        provider: { name: 'Test', jobId: 'test-1' },
        location: {},
        salary: {},
      });

      // --- ACT & ASSERT ---
      // The exact error message contains 'NOT NULL constraint failed' for SQLite
      await expect(jobRepository.save(jobWithNullTitle)).rejects.toThrow(
        QueryFailedError,
      );
    });
  });

  describe('when updating a job', () => {
    it('should allow updating a job title', async () => {
      // --- ARRANGE ---
      const job = await jobRepository.save(
        jobRepository.create({
          title: 'Junior Dev',
          provider: { name: 'Test', jobId: 'update-1' },
          location: {},
          salary: {},
        }),
      );

      // --- ACT ---
      job.title = 'Mid-Level Dev';
      await jobRepository.save(job);
      const updatedJob = await jobRepository.findOneBy({ id: job.id });

      // --- ASSERT ---
      expect(updatedJob).toBeDefined();
      expect(updatedJob?.title).toBe('Mid-Level Dev');
    });

    it('should allow adding and removing skills from a job', async () => {
      // --- ARRANGE ---
      const initialSkill = await skillRepository.save({ name: 'Java' });
      const job = await jobRepository.save(
        jobRepository.create({
          title: 'Java Developer',
          provider: { name: 'Test', jobId: 'update-skills' },
          skills: [initialSkill],
          location: {},
          salary: {},
        }),
      );

      // --- ACT (Add and Remove) ---
      const newSkill = await skillRepository.save({ name: 'Spring' });
      // To update relations, you must re-assign the array
      job.skills = [newSkill]; // Remove Java, add Spring
      await jobRepository.save(job);

      const updatedJob = await jobRepository.findOne({
        where: { id: job.id },
        relations: { skills: true },
      });

      // --- ASSERT ---
      expect(updatedJob).toBeDefined();
      expect(updatedJob?.skills).toHaveLength(1);
      expect(updatedJob?.skills[0].name).toBe('Spring');
    });

    it('should allow changing the company associated with a job', async () => {
      // --- ARRANGE ---
      const company1 = await companyRepository.save({ name: 'Company A' });
      const company2 = await companyRepository.save({ name: 'Company B' });
      const job = await jobRepository.save(
        jobRepository.create({
          title: 'Consultant',
          provider: { name: 'Test', jobId: 'update-company' },
          company: company1,
          location: {},
          salary: {},
        }),
      );

      // --- ACT ---
      job.company = company2; // Re-assign the company
      await jobRepository.save(job);
      const updatedJob = await jobRepository.findOne({
        where: { id: job.id },
        relations: { company: true },
      });

      // --- ASSERT ---
      expect(updatedJob).toBeDefined();
      expect(updatedJob?.company).toBeDefined();
      expect(updatedJob?.company.id).toBe(company2.id);
      expect(updatedJob?.company.name).toBe('Company B');
    });
  });
});
