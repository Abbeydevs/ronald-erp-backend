import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule);

  app.enableCors();

  const port = process.env.PORT || 3000;
  await app.listen(port);

  console.log(`Application is running on port: ${port}`);
}
// eslint-disable-next-line @typescript-eslint/no-floating-promises
bootstrap();
