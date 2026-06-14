import { ValidationPipe } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { NestFactory } from "@nestjs/core";
import { AppModule } from "./app.module";

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const config = app.get(ConfigService);
  const frontendUrl = config.get<string>("FRONTEND_URL") || "http://localhost:3000";
  const port = Number(config.get<string>("PORT") || 3001);

  app.setGlobalPrefix("api", { exclude: ["health"] });
  app.enableCors({
    origin: frontendUrl,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE"],
    allowedHeaders: ["Content-Type", "X-API-Key"],
  });
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    })
  );

  await app.listen(port);
  console.log(`Widi Expense Tracker API running on http://localhost:${port}`);
}

bootstrap();
