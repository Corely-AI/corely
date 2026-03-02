import { Logger } from "@nestjs/common";

const logger = new Logger("WorkerJobScheduler");

export type WorkerJobName = "worker.tick" | "crm.sequence.executeStep";

export type ScheduleWorkerJobInput = {
  jobName: WorkerJobName;
  payload: unknown;
  runAt?: Date;
  idempotencyKey?: string;
  traceId?: string;
  timeoutMs?: number;
};

export type ScheduleWorkerJobResult = {
  scheduled: boolean;
  externalRef?: string;
  statusCode?: number;
};

export async function scheduleWorkerJob(
  input: ScheduleWorkerJobInput
): Promise<ScheduleWorkerJobResult> {
  const workerUrl = process.env.INTERNAL_WORKER_URL?.trim();
  if (!workerUrl) {
    return { scheduled: false };
  }

  const normalizedUrl = workerUrl.replace(/\/$/, "");
  const endpoint = `${normalizedUrl}/internal/schedule`;
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
        jobName: input.jobName,
        payload: input.payload,
        ...(input.runAt ? { runAt: input.runAt.toISOString() } : {}),
        ...(input.idempotencyKey ? { idempotencyKey: input.idempotencyKey } : {}),
        ...(input.traceId ? { traceId: input.traceId } : {}),
      }),
      signal: controller.signal,
    });

    if (!response.ok) {
      const body = await response.text().catch(() => "");
      logger.warn(
        `Worker scheduling failed: job=${input.jobName} status=${response.status} body=${body}`
      );
      return { scheduled: false, statusCode: response.status };
    }

    const payload = (await response.json().catch(() => ({}))) as {
      externalRef?: string;
    };
    return {
      scheduled: true,
      externalRef: payload.externalRef,
      statusCode: response.status,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    logger.warn(`Worker scheduling request error: job=${input.jobName} message=${message}`);
    return { scheduled: false };
  } finally {
    clearTimeout(timeout);
  }
}
