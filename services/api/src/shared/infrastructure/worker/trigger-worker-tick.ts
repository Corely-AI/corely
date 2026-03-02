import { Logger } from "@nestjs/common";

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
  const workerUrl = process.env.INTERNAL_WORKER_URL?.trim();
  if (!workerUrl) {
    return;
  }

  const normalizedUrl = workerUrl.replace(/\/$/, "");
  const endpoint = `${normalizedUrl}/internal/tick`;
  const workerKey = process.env.INTERNAL_WORKER_KEY?.trim();
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
        ...(workerKey ? { "x-worker-key": workerKey } : {}),
      },
      body: JSON.stringify({
        reason: input.reason,
        correlationId: input.correlationId,
        tenantId: input.tenantId,
        workspaceId: input.workspaceId,
        runnerNames: input.runnerNames,
      }),
      signal: controller.signal,
    });

    if (!response.ok) {
      const body = await response.text().catch(() => "");
      logger.warn(
        `Worker tick trigger failed: status=${response.status} reason=${input.reason} body=${body}`
      );
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    logger.warn(`Worker tick trigger request error: reason=${input.reason} message=${message}`);
  } finally {
    clearTimeout(timeout);
  }
}
