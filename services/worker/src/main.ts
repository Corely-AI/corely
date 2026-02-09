import "reflect-metadata";
import { EnvService, loadEnv } from "@corely/config";
import { NestFactory } from "@nestjs/core";
import { WorkerModule } from "./worker.module";
import { CONTRACTS_HELLO } from "@corely/contracts";
import { setupTracing, shutdownTracing } from "./observability/setup-tracing";
import { Logger } from "@nestjs/common";
import { TickOrchestrator } from "./application/tick-orchestrator.service";

// Load env files before anything else
loadEnv();

async function bootstrap() {
  const logger = new Logger("WorkerBootstrap");
  await setupTracing("corely-worker");

  const command = process.argv[2];

  if (command === "tick") {
    const app = await NestFactory.createApplicationContext(WorkerModule);
    try {
      const orchestrator = app.get(TickOrchestrator);
      await orchestrator.runTick();
    } catch (err) {
      logger.error(err instanceof Error ? (err.stack ?? err.message) : String(err));
      throw err;
    } finally {
      await app.close();
    }
    logger.log("[worker] tick completed");
    return;
  }

  const driver = process.env.WORKFLOW_QUEUE_DRIVER;
  if (driver === "cloudtasks") {
    const app = await NestFactory.create(WorkerModule);
    const env = app.get(EnvService);
    const port = Number(process.env.WORKER_PORT ?? env.WORKER_PORT ?? process.env.PORT ?? 3001);
    await app.listen(port);
    logger.log(`[worker] listening on ${port}`);
  } else {
    await NestFactory.createApplicationContext(WorkerModule);
  }

  logger.log("[worker] started");
  logger.log("[worker] " + CONTRACTS_HELLO);

  setInterval(() => {
    logger.log("[worker] tick " + new Date().toISOString());
  }, 10_000);
}

bootstrap().catch((err) => {
  const logger = new Logger("WorkerBootstrap");
  logger.error(err instanceof Error ? (err.stack ?? err.message) : String(err));
  void shutdownTracing();
  throw err;
});
