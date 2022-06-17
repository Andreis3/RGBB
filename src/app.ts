import { NestFactory } from '@nestjs/core';
import RootModule from './RootModule';
import { HttpStatus, ValidationPipe } from '@nestjs/common';
import { AllExceptionFilter } from '../exceptions/ExceptionFilter';

export default async () => {
  const app = await NestFactory.create(RootModule, { cors: true });
  app.enableCors();
  app.useGlobalPipes(
    new ValidationPipe({
      transform: true,
      errorHttpStatusCode: HttpStatus.UNPROCESSABLE_ENTITY,
    }),
  );
  // app.useGlobalFilters(new AllExceptionFilter());

  return app;
};
