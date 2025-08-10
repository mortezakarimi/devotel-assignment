import { MigrationInterface, QueryRunner } from 'typeorm';

export class Initial1754765544816 implements MigrationInterface {
  name = 'Initial1754765544816';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "companies" ("id" SERIAL NOT NULL, "name" character varying(255) NOT NULL, "industry" character varying(255), "website" character varying(255), "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "UQ_3dacbb3eb4f095e29372ff8e131" UNIQUE ("name"), CONSTRAINT "PK_d4bc3e82a314fa9e29f652c2c22" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."jobs_job_type_enum" AS ENUM('Full-Time', 'Part-Time', 'Contract')`,
    );
    await queryRunner.query(
      `CREATE TABLE "jobs" ("id" SERIAL NOT NULL, "title" character varying NOT NULL, "is_remote" boolean NOT NULL DEFAULT false, "job_type" "public"."jobs_job_type_enum", "experience_years" smallint, "posted_date" TIMESTAMP, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), "company_id" integer, "provider_name" character varying NOT NULL, "provider_job_id" character varying NOT NULL, "location_city" character varying, "location_state" character varying, "salary_min" integer, "salary_max" integer, "salary_currency" character varying(10), CONSTRAINT "PK_cf0a6c42b72fcc7f7c237def345" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_29e5de0b5a9d1215a714008d9d" ON "jobs" ("job_type") `,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_b9ffcaf85b62cb3f9a7ff9faa1" ON "jobs" ("provider_name", "provider_job_id") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_38fec40b6768c7a740804d6c80" ON "jobs" ("provider_name") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_53821af14315c4bc0ddf8f56d9" ON "jobs" ("provider_job_id") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_3df209f42aac0a2253a3bb7fdd" ON "jobs" ("location_city") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_0b2045cd74f79d52c1566874e0" ON "jobs" ("location_state") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_f6413073271e0aed4c5ad6d7fd" ON "jobs" ("salary_min") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_c8743462ee92ec56a4dffd2556" ON "jobs" ("salary_max") `,
    );
    await queryRunner.query(
      `CREATE TABLE "skills" ("id" SERIAL NOT NULL, "name" character varying(255) NOT NULL, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "UQ_81f05095507fd84aa2769b4a522" UNIQUE ("name"), CONSTRAINT "PK_0d3212120f4ecedf90864d7e298" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."settings_key_enum" AS ENUM('JobFetchScheduleInterval')`,
    );
    await queryRunner.query(
      `CREATE TABLE "settings" ("id" SERIAL NOT NULL, "key" "public"."settings_key_enum" NOT NULL, "value" jsonb, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "UQ_c8639b7626fa94ba8265628f214" UNIQUE ("key"), CONSTRAINT "PK_0669fe20e252eb692bf4d344975" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "job_skills" ("job_id" integer NOT NULL, "skill_id" integer NOT NULL, CONSTRAINT "PK_cc853451c17c3913492abc1e6e6" PRIMARY KEY ("job_id", "skill_id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_4f7427e13d249156f37669e712" ON "job_skills" ("job_id") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_7c0a3c52e77f9d9d839fdbb14b" ON "job_skills" ("skill_id") `,
    );
    await queryRunner.query(
      `ALTER TABLE "jobs" ADD CONSTRAINT "FK_087a773c50525e348e26188e7cc" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "job_skills" ADD CONSTRAINT "FK_4f7427e13d249156f37669e7127" FOREIGN KEY ("job_id") REFERENCES "jobs"("id") ON DELETE CASCADE ON UPDATE CASCADE`,
    );
    await queryRunner.query(
      `ALTER TABLE "job_skills" ADD CONSTRAINT "FK_7c0a3c52e77f9d9d839fdbb14b6" FOREIGN KEY ("skill_id") REFERENCES "skills"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "job_skills" DROP CONSTRAINT "FK_7c0a3c52e77f9d9d839fdbb14b6"`,
    );
    await queryRunner.query(
      `ALTER TABLE "job_skills" DROP CONSTRAINT "FK_4f7427e13d249156f37669e7127"`,
    );
    await queryRunner.query(
      `ALTER TABLE "jobs" DROP CONSTRAINT "FK_087a773c50525e348e26188e7cc"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_7c0a3c52e77f9d9d839fdbb14b"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_4f7427e13d249156f37669e712"`,
    );
    await queryRunner.query(`DROP TABLE "job_skills"`);
    await queryRunner.query(`DROP TABLE "settings"`);
    await queryRunner.query(`DROP TYPE "public"."settings_key_enum"`);
    await queryRunner.query(`DROP TABLE "skills"`);
    await queryRunner.query(
      `DROP INDEX "public"."IDX_c8743462ee92ec56a4dffd2556"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_f6413073271e0aed4c5ad6d7fd"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_0b2045cd74f79d52c1566874e0"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_3df209f42aac0a2253a3bb7fdd"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_53821af14315c4bc0ddf8f56d9"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_38fec40b6768c7a740804d6c80"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_b9ffcaf85b62cb3f9a7ff9faa1"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_29e5de0b5a9d1215a714008d9d"`,
    );
    await queryRunner.query(`DROP TABLE "jobs"`);
    await queryRunner.query(`DROP TYPE "public"."jobs_job_type_enum"`);
    await queryRunner.query(`DROP TABLE "companies"`);
  }
}
