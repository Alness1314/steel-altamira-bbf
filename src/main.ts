import { Logger, ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  const logger = new Logger('NestApplication');

  const apiPrefix = process.env.API_PREFIX ?? 'api';
  const swaggerPath = process.env.SWAGGER_PATH ?? 'docs';

  const corsOriginsEnv = process.env.CORS_ORIGINS;
  const corsOrigins = corsOriginsEnv
    ? corsOriginsEnv.split(',').map((origin) => origin.trim())
    : ['http://localhost:3000', 'http://localhost:5173'];

  const allowAllOrigins = corsOrigins.includes('*');

  app.setGlobalPrefix(apiPrefix);

  app.enableCors({
    origin: allowAllOrigins ? true : corsOrigins,
    methods: ['GET', 'POST', 'OPTIONS', 'PUT', 'PATCH', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true,
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  const swaggerConfig = new DocumentBuilder()
    .setTitle('Altamira Steel BFF')
    .setDescription(
      'API BFF para formulario React y envio de correos con SendGrid',
    )
    .setVersion('1.0.0')
    .build();

  const swaggerDocument = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup(swaggerPath, app, swaggerDocument);

  await app.listen(process.env.PORT ?? 3000);

  logger.log(`Server running in ${await app.getUrl()}/${swaggerPath}`);
}
void bootstrap();
