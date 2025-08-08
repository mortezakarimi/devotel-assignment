import {
  Injectable,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import IProvider from '@/providers/contracts/provider.interface';
import {
  Compensation,
  JobsList,
  Provider2,
} from '@/providers/provider2/provider2.interface';
import { JobEntity } from '@/database/entities/job.entity';
import { ConfigService } from '@nestjs/config';
import { EnvironmentVariables } from '@/env.validation';
import { HttpService } from '@nestjs/axios';
import { catchError, firstValueFrom } from 'rxjs';
import { AxiosError } from 'axios';
import { RuntimeException } from '@nestjs/core/errors/exceptions';
import { SkillEntity } from '@/database/entities/skill.entity';
import { DateTime } from 'luxon';
import { currencySymbolMap } from '@/providers/contracts/currency-symbol';

@Injectable()
export class Provider2Service implements IProvider<Provider2, JobsList> {
  private logger = new Logger(Provider2Service.name);
  constructor(
    private configService: ConfigService<EnvironmentVariables, true>,
    private httpService: HttpService,
  ) {}

  async fetch(): Promise<Provider2> {
    const { data } = await firstValueFrom(
      this.httpService
        .get<Provider2>(this.configService.get<string>('PROVIDER_TWO'))
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
    return Object.entries(data.data.jobsList).map(([id, j]) =>
      this.toJob({ [id]: j }),
    );
  }

  toJob(data: JobsList): JobEntity {
    const entries = Object.entries(data);
    if (entries.length == 0 || entries.length > 1) {
      throw new RuntimeException(
        'Only one job is allowed for conversion at a time.',
      );
    }

    const [jobId, job] = entries.at(0)!;
    return new JobEntity({
      title: job.position,
      provider: {
        name: 'Provider2',
        jobId: jobId,
      },
      company: {
        name: job.employer.companyName,
        industry: null,
        website: job.employer.website,
      },
      salary: this.parseSalary(job.compensation),
      isRemote: job.location.remote,
      postedDate: new Date(job.datePosted),
      experienceYears: job.requirements.experience,
      location: {
        state: job.location.state,
        city: job.location.city,
      },
      skills: this.generateSkills(job.requirements.technologies),
      jobType: null,
    });
  }
  fromJob(data: JobEntity): JobsList {
    if (data.provider.name === 'Provider2') {
      return {
        [data.provider.jobId]: {
          position: data.title,
          location: {
            state: data.location.state,
            city: data.location.city,
            remote: data.isRemote,
          },
          compensation: {
            min: data.salary.min,
            max: data.salary.max,
            currency: data.salary.currency,
          },
          employer: {
            companyName: data.company.name,
            website: data.company.website!,
          },
          requirements: {
            experience: data.experienceYears!,
            technologies: data.skills.map((s) => s.name),
          },
          datePosted: DateTime.fromJSDate(data.postedDate).toISODate()!,
        },
      };
    }
    throw new RuntimeException('This job cannot convert to this provider job.');
  }

  private generateSkills(skills: string[]): SkillEntity[] {
    return skills.map((item) => {
      return new SkillEntity(item);
    });
  }

  private parseSalary(compensation: Compensation) {
    const min = compensation.min;
    const max = compensation.max;

    if (min > max) {
      throw new RuntimeException(
        'Minimum value cannot be greater than the maximum value.',
      );
    }
    const currencyIndex = Object.keys(currencySymbolMap).findIndex(
      (key) => currencySymbolMap[key] === compensation.currency,
    );

    if (-1 === currencyIndex) {
      throw new RuntimeException(
        `Unsupported currency: ${compensation.currency}`,
      );
    }

    return {
      min,
      max,
      currency: compensation.currency,
    };
  }
}
