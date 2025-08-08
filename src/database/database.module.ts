import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CompanyEntity } from '@/database/entities/company.entity';
import { JobEntity } from '@/database/entities/job.entity';
import { SkillEntity } from '@/database/entities/skill.entity';

@Module({
  imports: [TypeOrmModule.forFeature([CompanyEntity, JobEntity, SkillEntity])],
  exports: [TypeOrmModule],
})
export class DatabaseModule {}
