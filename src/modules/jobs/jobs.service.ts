import {
  Injectable,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { In, Repository } from 'typeorm';
import { JobEntity } from '@/database/entities/job.entity';
import { InjectRepository } from '@nestjs/typeorm';
import {
  FilterOperator,
  paginate,
  Paginate,
  type PaginateConfig,
  type PaginateQuery,
} from 'nestjs-paginate';
import { ProvidersService } from '@/providers/providers.service';
import { SkillEntity } from '@/database/entities/skill.entity';
import { CompanyEntity } from '@/database/entities/company.entity';

/**
 * Service responsible for managing job-related operations including CRUD operations,
 * pagination, filtering, and loading jobs from external providers.
 *
 * This service handles the business logic for job management, including:
 * - Retrieving jobs with pagination, sorting, and filtering
 * - Loading jobs from external providers
 * - Managing relationships between jobs, companies, and skills
 * - Ensuring data consistency when saving jobs with related entities
 *
 * @example
 * ```typescript
 * // Get paginated jobs with filters
 * const jobs = await jobsService.findAll({
 *   page: 1,
 *   limit: 20,
 *   filter: { 'company.name': 'Tech Corp' }
 * });
 *
 * // Load jobs from providers
 * const loadedJobs = await jobsService.load();
 * ```
 */
@Injectable()
export class JobsService {
  private readonly logger = new Logger(JobsService.name);

  /**
   * Configuration for job pagination, sorting, and filtering.
   *
   * This configuration defines:
   * - Sortable columns including nested properties
   * - Searchable columns for text search
   * - Filterable columns with supported operators
   * - Default sorting and pagination settings
   * - Maximum limits and relations to load
   */
  static readonly PAGINATION_CONFIG: PaginateConfig<JobEntity> = {
    sortableColumns: [
      'createdAt',
      'postedDate',
      'company.name',
      'skills.name',
      'salary.min',
      'salary.max',
      'jobType',
      'title',
      'location.city',
      'location.state',
    ],
    searchableColumns: ['company.name', 'skills.name', 'jobType', 'title'],
    nullSort: 'last',
    defaultSortBy: [['createdAt', 'DESC']],
    relations: ['company', 'skills'],
    maxLimit: 100,
    defaultLimit: 20,
    filterableColumns: {
      title: [FilterOperator.ILIKE, FilterOperator.EQ],
      'company.name': [FilterOperator.ILIKE, FilterOperator.EQ],
      'skills.name': [FilterOperator.ILIKE, FilterOperator.EQ],
      'location.city': [FilterOperator.ILIKE, FilterOperator.EQ],
      'location.state': [FilterOperator.ILIKE, FilterOperator.EQ],
      'salary.min': [FilterOperator.GTE, FilterOperator.LTE],
      'salary.max': [FilterOperator.GTE, FilterOperator.LTE],
      isRemote: [FilterOperator.EQ],
      jobType: [FilterOperator.EQ],
    },
  };

  /**
   * Creates an instance of JobsService.
   *
   * @param jobRepository - Repository for managing JobEntity instances
   * @param skillRepository - Repository for managing SkillEntity instances
   * @param companyRepository - Repository for managing CompanyEntity instances
   * @param providersService - Service for loading jobs from external providers
   */
  constructor(
    @InjectRepository(JobEntity)
    private readonly jobRepository: Repository<JobEntity>,
    @InjectRepository(SkillEntity)
    private readonly skillRepository: Repository<SkillEntity>,
    @InjectRepository(CompanyEntity)
    private readonly companyRepository: Repository<CompanyEntity>,
    private readonly providersService: ProvidersService,
  ) {}

  /**
   * Retrieves a paginated list of jobs with optional filtering and sorting.
   *
   * This method uses the nestjs-paginate library to provide comprehensive
   * pagination, sorting, and filtering capabilities. It supports:
   * - Pagination with configurable page size and page number
   * - Sorting by any configured sortable column
   * - Filtering by job properties, company names, skill names, and location
   * - Text search across searchable columns
   *
   * @param query - Pagination query object containing page, limit, filters, and sorting options
   * @returns Promise resolving to paginated job results with metadata
   *
   * @example
   * ```typescript
   * // Get first page with default settings
   * const result = await jobsService.findAll({ path: '/' });
   *
   * // Get specific page with custom filters
   * const result = await jobsService.findAll({
   *   page: 2,
   *   limit: 10,
   *   filter: { 'company.name': 'Tech Corp', isRemote: '1' },
   *   sortBy: [['postedDate', 'DESC']],
   *   path: '/'
   * });
   * ```
   */
  async findAll(@Paginate() query: PaginateQuery) {
    return paginate(query, this.jobRepository, JobsService.PAGINATION_CONFIG);
  }
  /**
   * Loads jobs from external providers, processes them in bulk, and saves them to the database.
   *
   * This method is optimized to prevent N+1 query issues. It follows these steps:
   * 1. Fetches all job data from external providers.
   * 2. Extracts all unique company and skill names from the fetched data.
   * 3. Finds or creates all required companies and skills in bulk operations, minimizing database roundtrips.
   * 4. Constructs the final JobEntity objects with the correct, persisted relations.
   * 5. Saves all new jobs to the database in a single transaction.
   *
   * @returns {Promise<JobEntity[]>} A promise that resolves to an array of the newly saved JobEntity instances.
   * @throws {InternalServerErrorException} Throws a server error if fetching from providers fails or if there's a database persistence error.
   *
   * @example
   * ```typescript
   * // In another service or controller
   * const savedJobs = await jobsService.load();
   * console.log(`Successfully loaded and saved ${savedJobs.length} jobs.`);
   * ```
   */
  public async load(): Promise<JobEntity[]> {
    this.logger.log('Starting job loading process from external providers.');

    try {
      // 1. Fetch raw job data from all providers.
      const jobEntities = await this.providersService.load();
      if (!jobEntities || jobEntities.length === 0) {
        this.logger.log('No jobs found from providers. Aborting process.');
        return [];
      }
      this.logger.log(`Fetched ${jobEntities.length} jobs from providers.`);

      // 2. Find or create all necessary related entities (companies and skills) in bulk.
      const companiesMap = await this.findOrCreateCompanies(
        jobEntities.map((job) => job.company),
      );
      const skillsMap = await this.findOrCreateSkills(
        jobEntities.flatMap((job) => job.skills),
      );

      // 3. Prepare JobEntity objects for saving.
      const jobsToSave = jobEntities.map((jobDto) => {
        const company = companiesMap.get(jobDto.company.name);
        const skills = jobDto.skills
          .map((skillDto) => skillsMap.get(skillDto.name))
          .filter(Boolean) as SkillEntity[];

        // Here you would map all other properties from jobDto to the job entity
        // e.g., job.title = jobDto.title; job.description = jobDto.description; etc.
        jobDto.company = company!; //company always exist because in previous steps we make sure it exist
        jobDto.skills = skills;
        return jobDto;
      });

      // 4. Save all prepared jobs in a single database operation.
      this.logger.log(
        `Saving ${jobsToSave.length} processed jobs to the database.`,
      );
      const savedJobs = await this.jobRepository.save(jobsToSave);
      this.logger.log(`Successfully saved ${savedJobs.length} new jobs.`);

      return savedJobs;
    } catch (error) {
      this.logger.error('Failed to load and persist jobs.', error.stack);
      // We wrap the original error in a standard NestJS exception for consistent API error handling.
      throw new InternalServerErrorException(
        'An error occurred while loading jobs.',
      );
    }
  }

  /**
   * @internal
   * Finds existing companies or creates new ones in a single batch.
   * @param {Array<{name: string}>} companiesDto - An array of company data transfer objects.
   * @returns {Promise<Map<string, CompanyEntity>>} A map where keys are company names and values are the persisted CompanyEntity objects.
   */
  private async findOrCreateCompanies(
    companiesDto: { name: string }[],
  ): Promise<Map<string, CompanyEntity>> {
    // Get unique company names to avoid processing duplicates.
    const companyNames = [...new Set(companiesDto.map((c) => c.name))];
    this.logger.log(`Processing ${companyNames.length} unique companies.`);

    // Find all companies that already exist in the database in one query.
    const existingCompanies = await this.companyRepository.findBy({
      name: In(companyNames),
    });

    const existingCompaniesMap = new Map(
      existingCompanies.map((c) => [c.name, c]),
    );
    const newCompanyEntities: CompanyEntity[] = [];

    // Determine which companies are new.
    for (const name of companyNames) {
      if (!existingCompaniesMap.has(name)) {
        newCompanyEntities.push(this.companyRepository.create({ name }));
      }
    }

    // Save all new companies in a single query.
    if (newCompanyEntities.length > 0) {
      this.logger.log(`Creating ${newCompanyEntities.length} new companies.`);
      const savedNewCompanies =
        await this.companyRepository.save(newCompanyEntities);
      savedNewCompanies.forEach((c) => existingCompaniesMap.set(c.name, c));
    }

    return existingCompaniesMap;
  }

  /**
   * @internal
   * Finds existing skills or creates new ones in a single batch.
   * @param {Array<{name: string}>} skillsDto - An array of skill data transfer objects.
   * @returns {Promise<Map<string, SkillEntity>>} A map where keys are skill names and values are the persisted SkillEntity objects.
   */
  private async findOrCreateSkills(
    skillsDto: { name: string }[],
  ): Promise<Map<string, SkillEntity>> {
    // Get unique skill names.
    const skillNames = [...new Set(skillsDto.map((s) => s.name))];
    this.logger.log(`Processing ${skillNames.length} unique skills.`);

    // Find all skills that already exist.
    const existingSkills = await this.skillRepository.findBy({
      name: In(skillNames),
    });

    const existingSkillsMap = new Map(existingSkills.map((s) => [s.name, s]));
    const newSkillEntities: SkillEntity[] = [];

    // Determine which skills are new.
    for (const name of skillNames) {
      if (!existingSkillsMap.has(name)) {
        newSkillEntities.push(this.skillRepository.create({ name }));
      }
    }

    // Save all new skills in a single query.
    if (newSkillEntities.length > 0) {
      this.logger.log(`Creating ${newSkillEntities.length} new skills.`);
      const savedNewSkills = await this.skillRepository.save(newSkillEntities);
      savedNewSkills.forEach((s) => existingSkillsMap.set(s.name, s));
    }

    return existingSkillsMap;
  }
}
