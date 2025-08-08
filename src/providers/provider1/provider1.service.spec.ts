import { Test, TestingModule } from '@nestjs/testing';
import { HttpModule } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { InternalServerErrorException } from '@nestjs/common';
import { http, HttpResponse } from 'msw';

// Helper imports
import { DateTime } from 'luxon';

// Enum and Entity imports
import { JobTypeEnum } from '@/database/entities/enums/job-type.enum';
import { JobEntity } from '@/database/entities/job.entity';

// Service and Interface imports
import { Provider1Service } from './provider1.service';
import { Job as Provider1Job, Provider1 } from './provider1.interface';
import { server } from '@/__mocks__/server.mock';

/**
 * A static mock of Provider 1's job data.
 * Used for predictable unit testing of data transformation logic.
 */
const mockProvider1Job: Provider1Job = {
  jobId: 'P1-176',
  title: 'Backend Engineer',
  details: {
    location: 'San Francisco, CA',
    type: 'Full-Time',
    salaryRange: '$69k - $141k',
  },
  company: { name: 'Creative Design Ltd', industry: 'Analytics' },
  skills: ['Java', 'Spring Boot', 'AWS'],
  postedDate: '2025-07-28T04:15:47.230Z',
};

describe('Provider1Service', () => {
  let service: Provider1Service;
  const providerApiUrl = 'https://assignment.devotel.io/api/provider1/jobs';

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [HttpModule],
      providers: [
        Provider1Service,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn().mockReturnValue(providerApiUrl),
          },
        },
      ],
    }).compile();

    service = module.get<Provider1Service>(Provider1Service);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  // --- Integration Tests for API Fetching ---
  describe('fetch', () => {
    it('should fetch and return correctly structured jobs from the provider', async () => {
      const response: Provider1 = await service.fetch();
      expect(response.jobs).toHaveLength(5); // As defined in handlers.mock.ts

      // Perform a structural check on the first job to ensure data integrity
      const job = response.jobs[0];
      expect(typeof job.jobId).toBe('string');
      expect(job.jobId).not.toBe('');
      expect(typeof job.title).toBe('string');
      expect(typeof job.details.location).toBe('string');
      expect(typeof job.company.name).toBe('string');
      expect(Array.isArray(job.skills)).toBe(true);
      expect(job.skills.length).toBeGreaterThan(0);
      expect(DateTime.fromISO(job.postedDate).isValid).toBe(true);
    });

    it('should return an empty array when the API provides no jobs', async () => {
      // Override the default handler to return an empty response for this test
      server.use(
        http.get(providerApiUrl, () => {
          return HttpResponse.json({ jobs: [] });
        }),
      );

      const response = await service.fetch();
      expect(response.jobs).toEqual([]);
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
      const jobEntity = service.toJob(mockProvider1Job);

      expect(jobEntity).toBeInstanceOf(JobEntity);
      expect(jobEntity.provider.name).toBe('Provider1');
      expect(jobEntity.provider.jobId).toBe('P1-176');
      expect(jobEntity.title).toBe('Backend Engineer');
      expect(jobEntity.location).toEqual({
        city: 'San Francisco',
        state: 'CA',
      });
      expect(jobEntity.jobType).toBe(JobTypeEnum.FullTime);
      expect(jobEntity.salary).toEqual({
        min: 69000,
        max: 141000,
        currency: 'USD',
      });
      expect(jobEntity.postedDate.toISOString()).toBe(
        '2025-07-28T04:15:47.230Z',
      );
      expect(jobEntity.company.name).toBe('Creative Design Ltd');
      expect(jobEntity.skills.map((s) => s.name).sort()).toEqual([
        'AWS',
        'Java',
        'Spring Boot',
      ]);
    });

    it.each([
      { type: 'Full-Time', expected: JobTypeEnum.FullTime },
      { type: 'full-time', expected: JobTypeEnum.FullTime },
      { type: 'Part-Time', expected: JobTypeEnum.PartTime },
      { type: 'part-time', expected: JobTypeEnum.PartTime },
      { type: 'Contract', expected: JobTypeEnum.Contract },
      { type: 'contract', expected: JobTypeEnum.Contract },
    ])(
      'should correctly map job type "$type" to $expected',
      ({ type, expected }) => {
        const jobEntity = service.toJob({
          ...mockProvider1Job,
          details: { ...mockProvider1Job.details, type },
        });
        expect(jobEntity.jobType).toBe(expected);
      },
    );

    it('should throw an error for an invalid job type', () => {
      expect(() => {
        service.toJob({
          ...mockProvider1Job,
          details: { ...mockProvider1Job.details, type: 'Internship' },
        });
      }).toThrow('Invalid job type "Internship".');
    });

    it('should throw an error for an invalid location format', () => {
      expect(() => {
        service.toJob({
          ...mockProvider1Job,
          details: { ...mockProvider1Job.details, location: 'San Francisco' },
        });
      }).toThrow('Invalid location format. Expected format: City, State.');
    });

    it('should throw an error for an invalid salary range format', () => {
      expect(() => {
        service.toJob({
          ...mockProvider1Job,
          details: { ...mockProvider1Job.details, salaryRange: '$10.5 - $20k' },
        });
      }).toThrow('Invalid salary range format.');
    });

    it('should throw an error when salary min is greater than max', () => {
      expect(() => {
        service.toJob({
          ...mockProvider1Job,
          details: { ...mockProvider1Job.details, salaryRange: '$100k - $90k' },
        });
      }).toThrow('Minimum value cannot be greater than the maximum value.');
    });
  });

  // --- Unit Tests for Data Transformation (JobEntity -> Provider) ---
  describe('fromJob', () => {
    it('should convert a JobEntity back to the provider-specific format', () => {
      const originalJobEntity = service.toJob(mockProvider1Job);
      const providerJob = service.fromJob(originalJobEntity);
      expect(providerJob).toEqual(mockProvider1Job);
    });
    it('should convert a JobEntity back to the provider-specific format when salary range is less that 1000 without k', () => {
      const salaryRangeLessThan1000: Provider1Job = JSON.parse(
        JSON.stringify(mockProvider1Job),
      );
      salaryRangeLessThan1000.details.salaryRange = '$69 - $141k';
      const originalJobEntity = service.toJob(salaryRangeLessThan1000);
      const providerJob = service.fromJob(originalJobEntity);
      expect(providerJob).toEqual(salaryRangeLessThan1000);
    });

    it('should throw an error if the job entity is not from Provider1', () => {
      const jobEntity = service.toJob(mockProvider1Job);
      jobEntity.provider.name = 'Provider2'; // Mismatched provider
      expect(() => service.fromJob(jobEntity)).toThrow(
        'This job cannot convert to this provider job.',
      );
    });

    it('should throw an error for an unsupported currency', () => {
      const jobEntity = service.toJob(mockProvider1Job);
      jobEntity.salary.currency = 'XYZ'; // Unsupported currency
      expect(() => service.fromJob(jobEntity)).toThrow(
        'Unsupported currency: XYZ',
      );
    });
  });

  // --- End-to-End Test for the Public `load` Method ---
  describe('load', () => {
    it('should fetch data and transform it into an array of JobEntity instances', async () => {
      const jobs = await service.load();
      expect(jobs).toHaveLength(5);
      expect(jobs[0]).toBeInstanceOf(JobEntity);
      expect(jobs[0].provider.name).toBe('Provider1');
    });
  });
});
