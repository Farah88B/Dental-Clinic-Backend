import { RequestMethod, ValidationPipe, VersioningType } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { IoAdapter } from '@nestjs/platform-socket.io';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import helmet from 'helmet';

import { AppModule } from './app.module';
import { ConfigService } from '@nestjs/config';
import { API } from './common/constants/api.constants';


async function bootstrap() {

  const app = await NestFactory.create(AppModule);


  app.enableShutdownHooks();


  // Security
  app.use(helmet());


  // CORS
  app.enableCors({
    origin: true,
    credentials: true,
  });

  app.useWebSocketAdapter(new IoAdapter(app));

  
  // Versioning
  app.enableVersioning({
    type: VersioningType.URI,
    defaultVersion: API.DEFAULT_VERSION,
  });


  // Prefix
  app.setGlobalPrefix(API.PREFIX);



  // Validation
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
      transformOptions:{
        enableImplicitConversion:true,
      },
    }),
  );


  const config =
    app.get(ConfigService);


  const swaggerConfig =
    new DocumentBuilder()

    .setTitle(
      config.get<string>('app.name') ?? 'Dental Clinic API'
    )

    .setDescription(
      'Dental Clinic Management System API'
    )

    .setVersion('1.0')

    .addBearerAuth(
      {
        type:'http',
        scheme:'bearer',
        bearerFormat:'JWT',
      },
      'JWT',
    )

    .build();


  const document =
    SwaggerModule.createDocument(
      app,
      swaggerConfig,
    );
    


  SwaggerModule.setup(
  `${API.PREFIX}/${API.SWAGGER_PATH}`,
  app,
  document,
    {
      swaggerOptions:{
        persistAuthorization:true,
        displayRequestDuration:true,
      },
    },
  );


  await app.listen(
    config.get<number>('app.port')!,
  );
}


bootstrap(); 