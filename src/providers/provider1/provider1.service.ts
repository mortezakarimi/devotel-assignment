import {
  Injectable,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EnvironmentVariables } from '@/env.validation';
import { Job, Provider1 } from './provider1.interface';
import { HttpService } from '@nestjs/axios';
import { catchError, firstValueFrom } from 'rxjs';
import { AxiosError } from 'axios';
import IProvider from '@/providers/contracts/provider.interface';
import { JobEntity } from '@/database/entities/job.entity';
import { Salary } from '@/database/entities/embeddeds/salary.embedded';
import { Location } from '@/database/entities/embeddeds/location.embedded';
import { SkillEntity } from '@/database/entities/skill.entity';
import { JobTypeEnum } from '@/database/entities/enums/job-type.enum';
import { RuntimeException } from '@nestjs/core/errors/exceptions';
import { currencySymbolMap } from '@/providers/contracts/currency-symbol';

/**
 * A map to convert currency symbols to currency codes.
 * This can be expanded as needed.
 */

@Injectable()
export class Provider1Service implements IProvider<Provider1, Job> {
  private logger = new Logger(Provider1Service.name);
  constructor(
    private configService: ConfigService<EnvironmentVariables, true>,
    private httpService: HttpService,
  ) {}

  async fetch(): Promise<Provider1> {
    const { data } = await firstValueFrom(
      this.httpService
        .get<Provider1>(this.configService.get<string>('PROVIDER_ONE'))
        .pipe(
          catchError((error: AxiosError) => {
            this.logger.error(error.response?.data);
            throw new InternalServerErrorException();
          }),
        ),
    );
    return data;
  }
  async load(): Promise<JobEntity[]> {
    const data = await this.fetch();
    return data.jobs.map((j) => this.toJob(j));
  }

  toJob(data: Job): JobEntity {
    return new JobEntity({
      title: data.title,
      provider: {
        name: 'Provider1',
        jobId: data.jobId,
      },
      company: {
        name: data.company.name,
        industry: data.company.industry,
        website: null,
      },
      salary: this.parseSalaryRange(data.details.salaryRange),
      isRemote: false,
      postedDate: new Date(data.postedDate),
      experienceYears: null,
      location: this.generateLocation(data.details.location),
      skills: this.generateSkills(data.skills),
      jobType: this.getJobType(data.details.type),
    });
  }
  fromJob(data: JobEntity): Job {
    if (data.provider.name === 'Provider1') {
      return {
        title: data.title,
        details: {
          type: data.jobType!.toString(),
          location: `${data.location.city}, ${data.location.state}`,
          salaryRange: this.toSalaryRange(data.salary),
        },
        skills: data.skills.map((s) => s.name),
        jobId: data.provider.jobId,
        postedDate: data.postedDate.toISOString(),
        company: {
          name: data.company.name,
          industry: data.company.industry!,
        },
      };
    }
    throw new RuntimeException('This job cannot convert to this provider job.');
  }

  /**
   * Parses a salary range string (e.g., "$89k - $105k") into an object.
   * * This function uses a regular expression to robustly extract the
   * minimum value, maximum value, and currency symbol. It handles the 'k'
   * suffix to correctly convert values to their full numeric form (e.g., 89k -> 89000).
   *
   * @param rangeString The salary range string to parse.
   * @returns A SalaryRange object, or null if the string format is invalid.
   */
  private parseSalaryRange(rangeString: string): Salary {
    // Regular expression to capture currency, min/max values, and 'k' suffixes.
    // It's designed to be flexible with whitespace.
    const salaryRegex =
      /^\s*(?<currency>[$€£])\s*(?<min>\d+)(?<minK>k)?\s*-\s*\k<currency>\s*(?<max>\d+)(?<maxK>k)?\s*$/i;

    const match = rangeString.match(salaryRegex);

    // Check if the string matches the expected format.
    if (!match || !match.groups) {
      throw new RuntimeException(
        'Invalid salary range format. Expected format: $minK - $maxK',
      );
    }

    const { groups } = match;
    const currencySymbol = groups.currency;

    // Parse the min value, multiplying by 1000 if 'k' is present.
    let min = parseFloat(groups.min);
    if (groups.minK) {
      min *= 1000;
    }

    // Parse the max value, multiplying by 1000 if 'k' is present.
    let max = parseFloat(groups.max);
    if (groups.maxK) {
      max *= 1000;
    }

    // Ensure min is not greater than max.
    if (min > max) {
      throw new RuntimeException(
        'Minimum value cannot be greater than the maximum value.',
      );
    }

    // Map the symbol to the currency code, defaulting to the symbol if not found.
    const currency = currencySymbolMap[currencySymbol] || currencySymbol;

    const salary = new Salary();
    salary.min = min;
    salary.max = max;
    salary.currency = currency;
    return salary;
  }
  private generateLocation(locationString: string): Location {
    const location = new Location();
    const [city = '', state = ''] = locationString
      .split(',')
      .map((i) => i.trim());
    if (city == '' || state == '') {
      throw new RuntimeException(
        'Invalid location format. Expected format: City, State.',
      );
    }
    location.city = city;
    location.state = state;
    return location;
  }

  private generateSkills(skills: string[]): SkillEntity[] {
    return skills.map((item) => {
      return new SkillEntity(item);
    });
  }

  private getJobType(type: string): JobTypeEnum | undefined {
    switch (type.toLowerCase()) {
      case 'full-time':
        return JobTypeEnum.FullTime;
      case 'part-time':
        return JobTypeEnum.PartTime;
      case 'contract':
        return JobTypeEnum.Contract;
    }

    throw new RuntimeException(
      `Invalid job type "${type}". expected value: Full-Time, Part-Time, Contract.'`,
    );
  }

  /**
   * Converts a SalaryRange object back into a formatted string (e.g., "$89k - $105k").
   *
   * @param salaryObject The SalaryRange object to format.
   * @returns A formatted string, or an error message if the currency is not supported.
   */
  private toSalaryRange(salaryObject: Salary): string {
    const { min, max, currency } = salaryObject;

    // Find the currency symbol from the currency code (e.g., 'USD' -> '$')
    const currencySymbol = Object.keys(currencySymbolMap).find(
      (key) => currencySymbolMap[key] === currency,
    );

    if (!currencySymbol) {
      throw new RuntimeException(`Unsupported currency: ${currency}`);
    }

    // Helper function to format numbers with 'k' for thousands
    const formatValue = (value: number): string => {
      if (value >= 1000 && value % 1000 === 0) {
        return `${value / 1000}k`;
      }
      return value.toString();
    };

    const minFormatted = formatValue(min);
    const maxFormatted = formatValue(max);

    return `${currencySymbol}${minFormatted} - ${currencySymbol}${maxFormatted}`;
  }
}
