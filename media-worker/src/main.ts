import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Get config service
  const configService = app.get(ConfigService);
  const port = configService.get<number>('server.port', 8080);
  const env = configService.get<string>('server.env', 'development');

  // Global validation pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );

  // CORS
  app.enableCors({
    origin: true,
    credentials: true,
  });

  // Swagger documentation (only in development)
  if (env !== 'production') {
    const config = new DocumentBuilder()
      .setTitle('Botel AI Voice Media Worker')
      .setDescription('Media Worker API for Voice AI SDR Agent')
      .setVersion('1.0')
      .addTag('health', 'Health check endpoints')
      .addTag('calls', 'Call management endpoints')
      .build();
    
    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup('api', app, document);
  }

  // Graceful shutdown
  app.enableShutdownHooks();

  await app.listen(port);
  console.log(`🚀 Media Worker is running on: http://localhost:${port}`);
  
  if (env !== 'production') {
    console.log(`📚 API documentation available at: http://localhost:${port}/api`);
  }
}

bootstrap().catch((error) => {
  console.error('Failed to start application:', error);
  process.exit(1);
}); 