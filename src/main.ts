import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { NestExpressApplication } from '@nestjs/platform-express';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import { Logger } from '@nestjs/common';
import { DatabaseExceptionFilter } from '@/common/filters/database-exception.filter';
import { LoggerFactory } from '@/LoggerFactory';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    logger: LoggerFactory('Devotel'),
  });
  app.setGlobalPrefix('api', {
    exclude: ['health-check'],
  });
  app.useGlobalFilters(new DatabaseExceptionFilter());
  const configService = app.get(ConfigService);
  const config = new DocumentBuilder()
    .setTitle('Devotel Assignment')
    .setDescription('Job Listing service')
    .setVersion('1.0')
    .setOpenAPIVersion('3.1.1')
    .build();
  const documentFactory = () => SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api', app, documentFactory);
  // Starts listening for shutdown hooks
  app.enableShutdownHooks();
  await app.listen(configService.get('PORT') ?? 3000);
  const logger = new Logger('bootstrap');
  logger.log(`Listening on ${await app.getUrl()}`);
}
void bootstrap();
