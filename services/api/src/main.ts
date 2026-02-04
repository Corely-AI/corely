import "reflect-metadata";
import { loadEnv } from "@corely/config";
import { Logger } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import type { NestExpressApplication } from "@nestjs/platform-express";
import * as path from "path";
import { SwaggerModule, DocumentBuilder } from "@nestjs/swagger";
import { json, urlencoded } from "express";
import { AppModule } from "./app.module";
import { ProblemDetailsExceptionFilter } from "./shared/exceptions/problem-details.filter";
import { setupTracing, shutdownTracing } from "./shared/observability/setup-tracing";

// Load env files before anything else
loadEnv();

async function bootstrap() {
  const logger = new Logger("Bootstrap");
  const startedAt = Date.now();

  await setupTracing("corely-api");

  logger.log("Starting Nest factory");
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    logger: ["log", "error", "warn", "debug", "verbose"],
    bodyParser: false,
  });

  app.use(json({ limit: "50mb" }));
  app.use(urlencoded({ limit: "50mb", extended: true }));

  logger.log(
    `Nest application created in ${Date.now() - startedAt}ms; configuring CORS and Swagger`
  );

  // Register global exception filter (converts all errors to ProblemDetails)
  app.useGlobalFilters(new ProblemDetailsExceptionFilter());

  app.enableCors({ origin: true });

  if (process.env.NODE_ENV !== "production") {
    app.useStaticAssets(path.join(process.cwd(), "pdfs"), {
      prefix: "/__local/pdfs",
    });
  }

  // Swagger configuration
  const config = new DocumentBuilder()
    .setTitle("Corely API")
    .setDescription("Corely - AI-native workflows → ERP kernel")
    .setVersion("1.0")
    .addBearerAuth()
    .build();

  logger.log("Creating Swagger document");
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup("docs", app, document);

  logger.log("Initializing Nest application");
  await app.init();

  // Cloud Run injects PORT; fallback to 3000 for local dev
  const port = parseInt(process.env.PORT || "8080", 10);
  logger.log(`Starting HTTP server on port ${port}`);
  await app.listen(port, "0.0.0.0");

  logger.log(`[api] listening on http://localhost:${port}`);
  logger.log(`[api] swagger docs at http://localhost:${port}/docs`);
}

bootstrap().catch((err) => {
  const logger = new Logger("Bootstrap");
  logger.error("Bootstrap failed", err instanceof Error ? err.stack : `${err}`);
  void shutdownTracing();
  throw err;
});
