import { ValidationPipe } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { NestFactory } from "@nestjs/core";
import { AppModule } from "./app.module";

function getPort(configService: ConfigService): number {
  const rawPort = configService.get<string>("PORT", "4000");
  const port = Number(rawPort);

  if (!Number.isInteger(port) || port <= 0) {
    throw new Error(`Invalid PORT value: ${rawPort}`);
  }

  return port;
}

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule);
  const configService = app.get(ConfigService);

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true
    })
  );

  const clientUrl = configService.get<string>("CLIENT_URL", "http://localhost:3000");
  app.enableCors({
    origin: clientUrl,
    credentials: true
  });

  await app.listen(getPort(configService));
}

void bootstrap();
