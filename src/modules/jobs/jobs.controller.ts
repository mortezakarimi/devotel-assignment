import { Controller, Get, Post } from '@nestjs/common';
import { JobsService } from '@/modules/jobs/jobs.service';
import {
  ApiBadRequestResponse,
  ApiCreatedResponse,
  ApiInternalServerErrorResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import {
  Paginate,
  Paginated,
  PaginatedSwaggerDocs,
  type PaginateQuery,
} from 'nestjs-paginate';
import { JobEntity } from '@/database/entities/job.entity';
import { ErrorDto } from '@/common/dto/error.dto';

/**
 * @class JobsController
 * @description Handles HTTP requests related to job offers.
 * This controller provides endpoints for retrieving and managing job data.
 * It is tagged under "Jobs Offers" in the API documentation.
 */
@ApiTags('Jobs Offers')
@Controller('jobs-offers')
export class JobsController {
  /**
   * Injects JobsService to handle the business logic for jobs.
   * @param {JobsService} jobsService - The service responsible for job operations.
   */
  constructor(private jobsService: JobsService) {}

  /**
   * @method findAll
   * @description Retrieves a paginated and filterable list of job offers.
   * This endpoint supports sorting, filtering, and searching across various job attributes.
   * Refer to the `nestjs-paginate` documentation for detailed query parameter options.
   *
   * @param {PaginateQuery} query - The pagination query object from `nestjs-paginate`.
   * @returns {Promise<Paginated<JobEntity>>} A promise that resolves to a paginated list of jobs.
   */
  @ApiOperation({
    summary: 'Retrieve all job offers with pagination',
    description:
      'Provides a paginated list of jobs. Supports filtering, sorting, and searching on columns like title, company, skills, and location.',
  })
  @PaginatedSwaggerDocs(JobEntity, JobsService.PAGINATION_CONFIG)
  @ApiOkResponse({
    description: 'A paginated list of job offers was successfully retrieved.',
    type: Paginated<JobEntity>,
  })
  @ApiBadRequestResponse({
    description: 'Invalid pagination or filter query.',
    type: ErrorDto,
  })
  @ApiInternalServerErrorResponse({
    description: 'An internal server error occurred.',
    type: ErrorDto,
  })
  @Get()
  findAll(@Paginate() query: PaginateQuery): Promise<Paginated<JobEntity>> {
    return this.jobsService.findAll(query);
  }

  /**
   * @method load
   * @description Triggers the loading of new jobs from external providers.
   * This is an asynchronous operation that fetches jobs, processes them,
   * and saves them to the database.
   *
   * @returns {Promise<JobEntity[]>} A promise that resolves to the array of newly created job entities.
   */
  @ApiOperation({
    summary: 'Load new job offers from external providers',
    description:
      'Triggers a background process to fetch jobs from all configured external providers and saves them to the database. Returns the newly created jobs.',
  })
  @ApiCreatedResponse({
    description:
      'The job loading process was successfully triggered and completed.',
    type: [JobEntity],
  })
  @ApiInternalServerErrorResponse({
    description: 'An error occurred during the job loading process.',
    type: ErrorDto,
  })
  @Post('load')
  load(): Promise<JobEntity[]> {
    return this.jobsService.load();
  }
}
