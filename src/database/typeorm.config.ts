import { registerAs } from '@nestjs/config';
import { TypeOrmModuleOptions } from '@nestjs/typeorm';
import * as dotenv from 'dotenv';
import * as dotenvExpand from 'dotenv-expand';
import { DataSource, DataSourceOptions } from 'typeorm';
import { SnakeNamingStrategy } from 'typeorm-naming-strategies';
import * as process from 'node:process';

dotenvExpand.expand(
  dotenv.config({
    path: '.env',
  }),
);
const config: TypeOrmModuleOptions = {
  type: 'postgres',
  url: `${process.env.DATABASE_URL}`,
  entities: [
    __dirname + '/../**/entities/*.entity.{ts,js}',
    __dirname + '/../**/entities/*.view.{ts,js}',
  ],
  autoLoadEntities: true,
  namingStrategy: new SnakeNamingStrategy(),
  logging: process.env.NODE_ENV !== 'production' ? ['error', 'warn'] : false,
};

export default registerAs('database', () => config);
export const connectionSource = new DataSource({
  ...config,
  migrations: [__dirname + '/../../migrations/*.ts'],
  subscribers: [__dirname + '/../**/subscribers/*.subscriber.ts'],
} as DataSourceOptions);
