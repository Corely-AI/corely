import { Logger } from "@nestjs/common";
import { scheduleWorkerJob } from "./schedule-worker-job";

const logger = new Logger("WorkerTickTrigger");

export type TriggerWorkerTickInput = {
  reason: string;
  correlationId?: string;
  tenantId?: string;
  workspaceId?: string;
  runnerNames?: string[];
  timeoutMs?: number;
};

export async function triggerWorkerTick(input: TriggerWorkerTickInput): Promise<void> {
  const idempotencyKey = [
    "worker.tick",
    input.reason,
    input.tenantId ?? "no-tenant",
    input.workspaceId ?? "no-workspace",
    input.runnerNames?.slice().sort().join(",") ?? "all",
    input.correlationId ?? "no-correlation",
  ].join(":");

  const scheduled = await scheduleWorkerJob({
    jobName: "worker.tick",
    payload: {
      runnerNames: input.runnerNames,
    },
    idempotencyKey,
    traceId: input.correlationId,
    timeoutMs: input.timeoutMs,
  });
  if (scheduled.scheduled) {
    return;
  }

  const apiBaseUrl = process.env.API_BASE_URL?.trim() || process.env.INTERNAL_WORKER_URL?.trim();
  if (!apiBaseUrl) {
    return;
  }

  const normalizedUrl = apiBaseUrl.replace(/\/$/, "");
  const endpoint = `${normalizedUrl}/internal/background/outbox/run`;
  const timeoutMs = Number.isFinite(input.timeoutMs)
    ? Math.max(250, input.timeoutMs ?? 5000)
    : 5000;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        ...(process.env.WORKER_API_SERVICE_TOKEN
          ? { "x-service-token": process.env.WORKER_API_SERVICE_TOKEN }
          : {}),
      },
      body: JSON.stringify({}),
      signal: controller.signal,
    });

    if (!response.ok) {
      const body = await response.text().catch(() => "");
      logger.warn(
        `Background outbox trigger failed: status=${response.status} reason=${input.reason} body=${body}`
      );
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    logger.warn(
      `Background outbox trigger request error: reason=${input.reason} message=${message}`
    );
  } finally {
    clearTimeout(timeout);
  }
}
