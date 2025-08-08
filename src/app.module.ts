import { Module } from '@nestjs/common';
import { JobsModule } from './modules/jobs/jobs.module';
import { CompaniesModule } from './modules/companies/companies.module';
import { SkillsModule } from './modules/skills/skills.module';
import { ProvidersModule } from './providers/providers.module';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { validate } from './env.validation';
import { DatabaseModule } from './database/database.module';
import { TypeOrmModule, TypeOrmModuleOptions } from '@nestjs/typeorm';
import databaseConfig from './database/typeorm.config';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validate,
      expandVariables: true,
      validatePredefined: true,
      load: [databaseConfig],
    }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      // Use useFactory, useClass, or useExisting
      // to configure the DataSourceOptions.
      useFactory: async (
        configService: ConfigService,
      ): Promise<TypeOrmModuleOptions> =>
        configService.get<TypeOrmModuleOptions>('database')!,
    }),
    JobsModule,
    CompaniesModule,
    SkillsModule,
    ProvidersModule,
    DatabaseModule,
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}
