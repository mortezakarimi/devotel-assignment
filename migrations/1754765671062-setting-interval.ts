import { MigrationInterface, QueryRunner } from 'typeorm';

export class SettingInterval1754765671062 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`INSERT INTO public.settings (key, value)
                             VALUES ('JobFetchScheduleInterval', '10000');`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DELETE
                             from public.settings
                             WHERE key = 'JobFetchScheduleInterval';`);
  }
}
