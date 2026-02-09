import "reflect-metadata";
import { EnvService, loadEnv } from "@corely/config";
import { NestFactory } from "@nestjs/core";
import { Logger, type INestApplication, type INestApplicationContext } from "@nestjs/common";
import { WorkerModule } from "./worker.module";
import { CONTRACTS_HELLO } from "@corely/contracts";
import { setupTracing, shutdownTracing } from "./observability/setup-tracing";
import { TickOrchestrator } from "./application/tick-orchestrator.service";

// Load env files before anything else
loadEnv();

const SIGNALS: ReadonlyArray<NodeJS.Signals> = ["SIGINT", "SIGTERM"];

function modeFromArg(arg: string | undefined): "tick" | "background" {
  return arg === "tick" ? "tick" : "background";
}

function nextTickDelayMs(args: { elapsedMs: number; success: boolean; env: EnvService }): number {
  const base = args.success
    ? args.env.WORKER_TICK_LOOP_INTERVAL_MS
    : args.env.WORKER_TICK_LOOP_ERROR_BACKOFF_MS;
  const jitterMax = Math.max(0, args.env.WORKER_TICK_LOOP_MAX_JITTER_MS);
  const jitterMs = jitterMax > 0 ? Math.floor(Math.random() * (jitterMax + 1)) : 0;
  return Math.max(0, base - args.elapsedMs) + jitterMs;
}

async function sleepInterruptible(ms: number, shouldStop: () => boolean): Promise<void> {
  if (ms <= 0 || shouldStop()) {
    return;
  }

  await new Promise<void>((resolve) => {
    const timeout = setTimeout(() => {
      clearInterval(stopPoll);
      resolve();
    }, ms);
    const stopPoll = setInterval(() => {
      if (!shouldStop()) {
        return;
      }
      clearTimeout(timeout);
      clearInterval(stopPoll);
      resolve();
    }, 200);
  });
}

async function createWorkerApp(logger: Logger): Promise<{
  app: INestApplication | INestApplicationContext;
  env: EnvService;
  close: () => Promise<void>;
}> {
  const driver = process.env.WORKFLOW_QUEUE_DRIVER;
  if (driver === "cloudtasks") {
    const app = await NestFactory.create(WorkerModule);
    const env = app.get(EnvService);
    const port = Number(process.env.WORKER_PORT ?? env.WORKER_PORT ?? process.env.PORT ?? 3001);
    await app.listen(port);
    logger.log(`[worker] listening on ${port}`);
    return {
      app,
      env,
      close: async () => app.close(),
    };
  }

  const app = await NestFactory.createApplicationContext(WorkerModule);
  const env = app.get(EnvService);
  return {
    app,
    env,
    close: async () => app.close(),
  };
}

async function runSingleTick(logger: Logger): Promise<void> {
  const { app, close } = await createWorkerApp(logger);
  try {
    const orchestrator = app.get(TickOrchestrator);
    await orchestrator.runOnce();
    logger.log("[worker] tick completed");
  } finally {
    await close();
  }
}

async function runBackgroundLoop(logger: Logger): Promise<void> {
  const { app, env, close } = await createWorkerApp(logger);
  const orchestrator = app.get(TickOrchestrator);
  let shuttingDown = false;
  let inFlightTick: Promise<void> | undefined;

  const onSignal = (signal: NodeJS.Signals) => {
    if (shuttingDown) {
      return;
    }
    shuttingDown = true;
    logger.log(`[worker] received ${signal}, waiting for current tick to finish`);
  };

  for (const signal of SIGNALS) {
    process.once(signal, onSignal);
  }

  try {
    logger.log("[worker] started in background mode");
    logger.log("[worker] " + CONTRACTS_HELLO);

    while (!shuttingDown) {
      if (inFlightTick) {
        logger.warn("[worker] tick overlap prevented: previous tick is still running");
        await inFlightTick;
        continue;
      }

      const tickStartedAt = Date.now();
      let succeeded = true;
      try {
        inFlightTick = orchestrator.runOnce();
        await inFlightTick;
      } catch (error) {
        succeeded = false;
        logger.error(error instanceof Error ? (error.stack ?? error.message) : String(error));
      } finally {
        inFlightTick = undefined;
      }

      if (shuttingDown) {
        break;
      }

      const delayMs = nextTickDelayMs({
        elapsedMs: Date.now() - tickStartedAt,
        success: succeeded,
        env,
      });
      logger.log(
        `[worker] next tick in ${delayMs}ms (${succeeded ? "success" : "error-backoff"} mode)`
      );
      await sleepInterruptible(delayMs, () => shuttingDown);
    }
  } finally {
    if (inFlightTick) {
      await inFlightTick;
    }
    await close();
    for (const signal of SIGNALS) {
      process.removeListener(signal, onSignal);
    }
  }
}

async function bootstrap() {
  const logger = new Logger("WorkerBootstrap");
  await setupTracing("corely-worker");

  const mode = modeFromArg(process.argv[2]);
  logger.log(`[worker] mode=${mode}`);

  if (mode === "tick") {
    await runSingleTick(logger);
    await shutdownTracing();
    return;
  }

  await runBackgroundLoop(logger);
  await shutdownTracing();
}

bootstrap().catch((err) => {
  const logger = new Logger("WorkerBootstrap");
  logger.error(err instanceof Error ? (err.stack ?? err.message) : String(err));
  void shutdownTracing();
  process.exitCode = 1;
});
