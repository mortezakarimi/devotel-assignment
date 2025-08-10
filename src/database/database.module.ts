import { Global, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CompanyEntity } from '@/database/entities/company.entity';
import { JobEntity } from '@/database/entities/job.entity';
import { SkillEntity } from '@/database/entities/skill.entity';
import { SettingEntity } from '@/database/entities/setting.entity';

@Global()
@Module({
  imports: [
    TypeOrmModule.forFeature([
      CompanyEntity,
      JobEntity,
      SkillEntity,
      SettingEntity,
    ]),
  ],
  exports: [TypeOrmModule],
})
export class DatabaseModule {}
