import "reflect-metadata";
import { EnvService, loadEnv } from "@corely/config";
import { NestFactory } from "@nestjs/core";
import { Logger, type INestApplication, type INestApplicationContext } from "@nestjs/common";
import { WorkerModule } from "./worker.module";
import { CONTRACTS_HELLO } from "@corely/contracts";
import { setupTracing, shutdownTracing } from "./observability/setup-tracing";
import { TickOrchestrator, type TickRunSummary } from "./application/tick-orchestrator.service";

// Load env files before anything else
loadEnv();

const SIGNALS: ReadonlyArray<NodeJS.Signals> = ["SIGINT", "SIGTERM"];

function modeFromArg(arg: string | undefined): "tick" | "background" {
  return arg === "tick" ? "tick" : "background";
}

function randomJitter(maxMs: number): number {
  const max = Math.max(0, maxMs);
  return max > 0 ? Math.floor(Math.random() * (max + 1)) : 0;
}

function computeIdleBackoffMs(env: EnvService, idleStreak: number): number {
  const minMs = Math.max(1, env.WORKER_IDLE_BACKOFF_MIN_MS);
  const maxMs = Math.max(minMs, env.WORKER_IDLE_BACKOFF_MAX_MS);
  const exponent = Math.max(0, idleStreak - 1);
  return Math.min(maxMs, minMs * Math.pow(2, exponent));
}

function nextTickDelayMs(args: {
  success: boolean;
  hadWork: boolean;
  idleStreak: number;
  env: EnvService;
}): number {
  if (!args.success) {
    return (
      args.env.WORKER_TICK_LOOP_ERROR_BACKOFF_MS +
      randomJitter(args.env.WORKER_TICK_LOOP_MAX_JITTER_MS)
    );
  }
  if (args.hadWork) {
    return (
      args.env.WORKER_BUSY_LOOP_DELAY_MS + randomJitter(args.env.WORKER_IDLE_BACKOFF_JITTER_MS)
    );
  }
  return (
    computeIdleBackoffMs(args.env, args.idleStreak) +
    randomJitter(args.env.WORKER_IDLE_BACKOFF_JITTER_MS)
  );
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
  const t0 = Date.now();
  const timeoutRaw = Number(process.env.WORKER_BOOTSTRAP_TIMEOUT_MS ?? "60000");
  const timeoutMs = Number.isFinite(timeoutRaw) && timeoutRaw > 0 ? timeoutRaw : 60000;

  logger.log(`[bootstrap] Creating worker app context (timeout=${timeoutMs}ms)...`);

  let timeoutHandle: NodeJS.Timeout | undefined;
  const timeoutPromise = new Promise<never>((_, reject) => {
    timeoutHandle = setTimeout(() => {
      reject(new Error(`Worker app creation timed out after ${timeoutMs}ms`));
    }, timeoutMs);
  });

  // Heartbeat so we can see the process is alive during long init
  const heartbeat = setInterval(() => {
    logger.warn(`[bootstrap] Still waiting for NestJS init... (${Date.now() - t0}ms elapsed)`);
  }, 5_000);

  try {
    const driver = process.env.WORKFLOW_QUEUE_DRIVER;
    if (driver === "cloudtasks") {
      logger.log("[bootstrap] Initializing Nest application (cloudtasks driver)...");
      const app = await Promise.race([NestFactory.create(WorkerModule), timeoutPromise]);
      logger.log(`[bootstrap] NestFactory.create completed in ${Date.now() - t0}ms`);
      const env = app.get(EnvService);
      const port = Number(process.env.WORKER_PORT ?? env.WORKER_PORT ?? process.env.PORT ?? 3001);
      logger.log(`[bootstrap] Starting HTTP listener on port ${port}...`);
      await Promise.race([app.listen(port), timeoutPromise]);
      logger.log(`[bootstrap] Listening on ${port} (total ${Date.now() - t0}ms)`);
      return {
        app,
        env,
        close: async () => app.close(),
      };
    }

    logger.log("[bootstrap] Initializing Nest application context (default driver)...");
    const app = await Promise.race([
      NestFactory.createApplicationContext(WorkerModule),
      timeoutPromise,
    ]);
    const elapsed = Date.now() - t0;
    logger.log(`[bootstrap] App context initialized successfully in ${elapsed}ms`);
    const env = app.get(EnvService);
    return {
      app,
      env,
      close: async () => app.close(),
    };
  } finally {
    clearInterval(heartbeat);
    if (timeoutHandle) {
      clearTimeout(timeoutHandle);
    }
  }
}

async function runSingleTick(logger: Logger): Promise<void> {
  const t0 = Date.now();
  logger.log("[tick] Starting single tick run...");
  const { app, close } = await createWorkerApp(logger);
  logger.log(`[tick] App created in ${Date.now() - t0}ms, resolving TickOrchestrator...`);
  try {
    const orchestrator = app.get(TickOrchestrator);
    logger.log("[tick] TickOrchestrator resolved, executing runOnce()...");
    const tickStart = Date.now();
    const summary = await orchestrator.runOnce();
    logger.log(
      `[tick] runOnce() completed in ${Date.now() - tickStart}ms — runId=${summary.runId} processed=${summary.totalProcessed} errors=${summary.totalErrors} durationMs=${summary.durationMs}`
    );
    if (Object.keys(summary.runnerResults).length > 0) {
      for (const [name, report] of Object.entries(summary.runnerResults)) {
        logger.log(
          `[tick]   runner=${name} processed=${report.processedCount} updated=${report.updatedCount} skipped=${report.skippedCount} errors=${report.errorCount} durationMs=${report.durationMs}`
        );
      }
    }
  } finally {
    logger.log("[tick] Closing app context...");
    await close();
    logger.log(`[tick] Single tick run finished (total ${Date.now() - t0}ms)`);
  }
}

async function runBackgroundLoop(logger: Logger): Promise<void> {
  const { app, env, close } = await createWorkerApp(logger);
  logger.log("[worker] application context initialized");
  const orchestrator = app.get(TickOrchestrator);
  logger.log("[worker] tick orchestrator resolved");
  let shuttingDown = false;
  let inFlightTick: Promise<TickRunSummary> | undefined;
  let idleStreak = 0;

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

      let succeeded = true;
      let hadWork = false;
      try {
        inFlightTick = orchestrator.runOnce();
        const summary = await inFlightTick;
        hadWork = summary.totalProcessed > 0;
        if (hadWork) {
          idleStreak = 0;
        } else {
          idleStreak += 1;
        }
      } catch (error) {
        succeeded = false;
        idleStreak += 1;
        logger.error(error instanceof Error ? (error.stack ?? error.message) : String(error));
      } finally {
        inFlightTick = undefined;
      }

      if (shuttingDown) {
        break;
      }

      const delayMs = nextTickDelayMs({
        success: succeeded,
        hadWork,
        idleStreak,
        env,
      });
      logger.log(
        `[worker] next tick in ${delayMs}ms (${succeeded ? (hadWork ? "busy" : "idle") : "error-backoff"} mode)`
      );
      await sleepInterruptible(delayMs, () => shuttingDown);
    }
  } finally {
    logger.log(
      `[worker] background loop exiting (shuttingDown=${shuttingDown}, inFlight=${Boolean(inFlightTick)})`
    );
    if (inFlightTick) {
      const timeoutMs = Math.max(1_000, env.WORKER_SHUTDOWN_TIMEOUT_MS);
      const timed = new Promise<"timeout">((resolve) =>
        setTimeout(() => resolve("timeout"), timeoutMs)
      );
      const winner = await Promise.race([inFlightTick.then(() => "tick"), timed]);
      if (winner === "timeout") {
        logger.warn(`[worker] shutdown timeout reached (${timeoutMs}ms); closing app anyway`);
      }
    }
    await close();
    for (const signal of SIGNALS) {
      process.removeListener(signal, onSignal);
    }
  }
}

async function bootstrap() {
  const t0 = Date.now();
  const logger = new Logger("WorkerBootstrap");
  logger.log("[bootstrap] Starting worker bootstrap...");
  logger.log("[bootstrap] Setting up tracing...");
  await setupTracing("corely-worker");
  logger.log(`[bootstrap] Tracing ready in ${Date.now() - t0}ms`);

  const mode = modeFromArg(process.argv[2]);
  logger.log(`[bootstrap] mode=${mode}, pid=${process.pid}, node=${process.version}`);

  if (mode === "tick") {
    await runSingleTick(logger);
    await shutdownTracing();
    logger.log(`[bootstrap] Tick mode finished (total ${Date.now() - t0}ms)`);
    return;
  }

  logger.log("[bootstrap] Entering background loop...");
  await runBackgroundLoop(logger);
  logger.log(`[bootstrap] Background loop returned (total ${Date.now() - t0}ms)`);
  await shutdownTracing();
}

bootstrap().catch(async (err) => {
  const logger = new Logger("WorkerBootstrap");
  logger.error(err instanceof Error ? (err.stack ?? err.message) : String(err));
  await shutdownTracing();
  process.exitCode = 1;
});
