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
    const summary = await orchestrator.runOnce();
    logger.log(
      `[worker] tick completed runId=${summary.runId} processed=${summary.totalProcessed} errors=${summary.totalErrors} durationMs=${summary.durationMs}`
    );
  } finally {
    await close();
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
  const logger = new Logger("WorkerBootstrap");
  await setupTracing("corely-worker");

  const mode = modeFromArg(process.argv[2]);
  logger.log(`[worker] mode=${mode}`);

  if (mode === "tick") {
    await runSingleTick(logger);
    await shutdownTracing();
    return;
  }

  logger.log("[worker] entering background loop");
  await runBackgroundLoop(logger);
  logger.log("[worker] background loop returned");
  await shutdownTracing();
}

async function bootstrapWithTimeout(): Promise<void> {
  const timeoutRaw = Number(process.env.WORKER_BOOTSTRAP_TIMEOUT_MS ?? "30000");
  const timeoutMs = Number.isFinite(timeoutRaw) && timeoutRaw > 0 ? timeoutRaw : 30000;

  let timeoutHandle: NodeJS.Timeout | undefined;
  const timeoutPromise = new Promise<never>((_, reject) => {
    timeoutHandle = setTimeout(() => {
      reject(new Error(`Worker bootstrap timed out after ${timeoutMs}ms`));
    }, timeoutMs);
  });

  try {
    await Promise.race([bootstrap(), timeoutPromise]);
  } finally {
    if (timeoutHandle) {
      clearTimeout(timeoutHandle);
    }
  }
}

bootstrapWithTimeout().catch(async (err) => {
  const logger = new Logger("WorkerBootstrap");
  logger.error(err instanceof Error ? (err.stack ?? err.message) : String(err));
  await shutdownTracing();
  process.exitCode = 1;
});
