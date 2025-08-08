import { Test, TestingModule } from '@nestjs/testing';
import { HttpModule } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { InternalServerErrorException } from '@nestjs/common';
import { http, HttpResponse } from 'msw';

// Helper imports
import { DateTime } from 'luxon';

// Enum and Entity imports
import { JobEntity } from '@/database/entities/job.entity';

// Service and Interface imports
import { Provider2Service } from './provider2.service';
import { JobsList, Provider2 } from './provider2.interface';
import { server } from '@/__mocks__/server.mock';

/**
 * A static mock of Provider 2's job data, which is an object
 * with the job ID as the key.
 * Used for predictable unit testing of data transformation logic.
 */
const mockProvider2JobData: JobsList = {
  'job-297': {
    position: 'Data Scientist',
    location: { city: 'New York', state: 'NY', remote: false },
    compensation: { min: 63000, max: 98000, currency: 'USD' },
    employer: {
      companyName: 'DataWorks',
      website: 'https://dataworks.com',
    },
    requirements: {
      experience: 3,
      technologies: ['JavaScript', 'Node.js', 'React'],
    },
    datePosted: '2025-08-06',
  },
};

describe('Provider2Service', () => {
  let service: Provider2Service;
  const providerApiUrl = 'https://assignment.devotel.io/api/provider2/jobs';

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [HttpModule],
      providers: [
        Provider2Service,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn().mockReturnValue(providerApiUrl),
          },
        },
      ],
    }).compile();

    service = module.get<Provider2Service>(Provider2Service);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  // --- Integration Tests for API Fetching ---
  describe('fetch', () => {
    it('should fetch and return correctly structured jobs from the provider', async () => {
      const response: Provider2 = await service.fetch();
      const jobEntries = Object.entries(response.data.jobsList);

      expect(jobEntries.length).toBe(5); // As defined in handlers.mock.ts

      // Perform a structural check on the first job to ensure data integrity
      const [jobId, job] = jobEntries[0];
      expect(typeof jobId).toBe('string');
      expect(jobId).not.toBe('');

      expect(typeof job.position).toBe('string');
      expect(typeof job.location.city).toBe('string');
      expect(typeof job.location.remote).toBe('boolean');
      expect(typeof job.employer.companyName).toBe('string');
      expect(typeof job.requirements.experience).toBe('number');
      expect(Array.isArray(job.requirements.technologies)).toBe(true);
      expect(DateTime.fromISO(job.datePosted).isValid).toBe(true);
    });

    it('should return an empty object when the API provides no jobs', async () => {
      // Override the default handler to return an empty response for this test
      server.use(
        http.get(providerApiUrl, () => {
          return HttpResponse.json({
            status: 'success',
            data: { jobsList: {} },
          });
        }),
      );

      const response = await service.fetch();
      expect(response.data.jobsList).toEqual({});
    });

    it('should throw an InternalServerErrorException when the API call fails', async () => {
      // Override the default handler to simulate a server error
      server.use(
        http.get(providerApiUrl, () => {
          return new HttpResponse(null, { status: 500 });
        }),
      );

      await expect(service.fetch()).rejects.toThrow(
        InternalServerErrorException,
      );
    });
  });

  // --- Unit Tests for Data Transformation (Provider -> JobEntity) ---
  describe('toJob', () => {
    it('should convert provider data into a standard JobEntity', () => {
      const jobEntity = service.toJob(mockProvider2JobData);

      expect(jobEntity).toBeInstanceOf(JobEntity);
      expect(jobEntity.provider.name).toBe('Provider2');
      expect(jobEntity.provider.jobId).toBe('job-297');
      expect(jobEntity.title).toBe('Data Scientist');
      expect(jobEntity.location).toEqual({ city: 'New York', state: 'NY' });
      expect(jobEntity.jobType).toBeNull(); // Provider 2 does not supply this
      expect(jobEntity.salary).toEqual({
        min: 63000,
        max: 98000,
        currency: 'USD',
      });
      expect(jobEntity.postedDate.toISOString()).toBe(
        '2025-08-06T00:00:00.000Z',
      );
      expect(jobEntity.company).toEqual({
        name: 'DataWorks',
        industry: null,
        website: 'https://dataworks.com',
      });
      expect(jobEntity.skills.map((s) => s.name).sort()).toEqual([
        'JavaScript',
        'Node.js',
        'React',
      ]);
    });

    it('should throw an error if more than one job is passed for conversion', () => {
      const multipleJobs = {
        ...mockProvider2JobData,
        'job-300': mockProvider2JobData['job-297'],
      };
      expect(() => service.toJob(multipleJobs)).toThrow(
        'Only one job is allowed for conversion at a time.',
      );
    });

    it('should throw an error when salary min is greater than max', () => {
      const invalidSalaryJob = JSON.parse(JSON.stringify(mockProvider2JobData));
      invalidSalaryJob['job-297'].compensation = {
        min: 100000,
        max: 90000,
        currency: 'USD',
      };

      expect(() => service.toJob(invalidSalaryJob)).toThrow(
        'Minimum value cannot be greater than the maximum value.',
      );
    });

    it('should throw an error for an unsupported currency', () => {
      const invalidCurrencyJob: JobsList = JSON.parse(
        JSON.stringify(mockProvider2JobData),
      );
      invalidCurrencyJob['job-297'].compensation.currency = 'XYZ';

      expect(() => service.toJob(invalidCurrencyJob)).toThrow(
        'Unsupported currency: XYZ',
      );
    });
  });

  // --- Unit Tests for Data Transformation (JobEntity -> Provider) ---
  describe('fromJob', () => {
    it('should convert a JobEntity back to the provider-specific format', () => {
      const originalJobEntity = service.toJob(mockProvider2JobData);
      const providerJob = service.fromJob(originalJobEntity);
      expect(providerJob).toEqual(mockProvider2JobData);
    });

    it('should throw an error if the job entity is not from Provider2', () => {
      const jobEntity = service.toJob(mockProvider2JobData);
      jobEntity.provider.name = 'Provider1'; // Mismatched provider
      expect(() => service.fromJob(jobEntity)).toThrow(
        'This job cannot convert to this provider job.',
      );
    });
  });

  // --- End-to-End Test for the Public `load` Method ---
  describe('load', () => {
    it('should fetch data and transform it into an array of JobEntity instances', async () => {
      const jobs = await service.load();
      expect(jobs).toHaveLength(5);
      expect(jobs[0]).toBeInstanceOf(JobEntity);
      expect(jobs[0].provider.name).toBe('Provider2');
      expect(jobs[0].title).toBeDefined();
    });
  });
});
