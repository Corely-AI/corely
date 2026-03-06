import { createHash } from "node:crypto";
import { Logger } from "@nestjs/common";
import { CloudTasksClient } from "@google-cloud/tasks";

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
  if (resolveSchedulerDriver() === "cloudtasks") {
    return await scheduleWithCloudTasks(input);
  }
  return await triggerDirectly(input);
}

const MAX_SCHEDULE_HORIZON_MS = 29 * 24 * 60 * 60 * 1000;
let tasksClient: CloudTasksClient | null = null;
let queueInitPromise: Promise<void> | null = null;

async function scheduleWithCloudTasks(
  input: ScheduleWorkerJobInput
): Promise<ScheduleWorkerJobResult> {
  const config = readCloudTasksConfig();
  if (!config) {
    return { scheduled: false };
  }

  const requestedRunAt = input.runAt ?? new Date();
  const { effectivePayload, effectiveRunAt } = applyCheckpointIfNeeded(
    input.jobName,
    input.payload,
    requestedRunAt,
    Date.now()
  );
  const endpoint = `${config.baseUrl}${pathForJob(input.jobName)}`;
  const taskName =
    input.idempotencyKey && input.idempotencyKey.trim().length > 0
      ? `${config.queuePath}/tasks/${taskIdFor(input.jobName, input.idempotencyKey)}`
      : undefined;

  const task: Parameters<CloudTasksClient["createTask"]>[0]["task"] = {
    ...(taskName ? { name: taskName } : {}),
    httpRequest: {
      httpMethod: "POST",
      url: endpoint,
      headers: {
        "Content-Type": "application/json",
        ...(config.serviceToken ? { "x-service-token": config.serviceToken } : {}),
      },
      body: Buffer.from(JSON.stringify(effectivePayload)),
      ...(config.serviceAccountEmail
        ? {
            oidcToken: {
              serviceAccountEmail: config.serviceAccountEmail,
              audience: new URL(endpoint).origin,
            },
          }
        : {}),
    },
  };

  if (effectiveRunAt.getTime() > Date.now()) {
    task.scheduleTime = {
      seconds: Math.floor(effectiveRunAt.getTime() / 1000),
      nanos: (effectiveRunAt.getTime() % 1000) * 1_000_000,
    };
  }

  const client = getTasksClient();
  await ensureQueue(client, config);

  try {
    const [created] = await client.createTask({
      parent: config.queuePath,
      task,
    });
    return {
      scheduled: true,
      externalRef: created.name,
      statusCode: 200,
    };
  } catch (error) {
    if (taskName && isErrorCode(error, 6)) {
      return { scheduled: true, externalRef: taskName, statusCode: 200 };
    }
    const message = error instanceof Error ? error.message : String(error);
    logger.warn(`Cloud Tasks scheduling failed: job=${input.jobName} message=${message}`);
    return { scheduled: false };
  }
}

async function triggerDirectly(input: ScheduleWorkerJobInput): Promise<ScheduleWorkerJobResult> {
  const baseUrl = resolveApiBaseUrl();
  if (!baseUrl) {
    return { scheduled: false };
  }

  if (input.runAt && input.runAt.getTime() > Date.now() + 1_000) {
    return { scheduled: false };
  }

  const timeoutMs = Number.isFinite(input.timeoutMs)
    ? Math.max(250, input.timeoutMs ?? 5000)
    : 5000;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(`${baseUrl}${pathForJob(input.jobName)}`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        ...(process.env.WORKER_API_SERVICE_TOKEN
          ? { "x-service-token": process.env.WORKER_API_SERVICE_TOKEN }
          : {}),
      },
      body: JSON.stringify(input.payload),
      signal: controller.signal,
    });

    if (!response.ok) {
      const body = await response.text().catch(() => "");
      logger.warn(
        `Direct scheduling failed: job=${input.jobName} status=${response.status} body=${body}`
      );
      return { scheduled: false, statusCode: response.status };
    }

    return { scheduled: true, statusCode: response.status };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    logger.warn(`Direct scheduling request error: job=${input.jobName} message=${message}`);
    return { scheduled: false };
  } finally {
    clearTimeout(timeout);
  }
}

function resolveSchedulerDriver(): string {
  return process.env.JOB_SCHEDULER_DRIVER ?? "noop";
}

function resolveApiBaseUrl(): string | null {
  const raw = process.env.API_BASE_URL?.trim() || process.env.INTERNAL_WORKER_URL?.trim();
  return raw ? raw.replace(/\/$/, "") : null;
}

function pathForJob(job: WorkerJobName): string {
  if (job === "worker.tick") {
    return "/internal/background/outbox/run";
  }
  return "/internal/crm/sequences/execute-step";
}

function taskIdFor(job: WorkerJobName, idempotencyKey: string): string {
  const hash = createHash("sha256")
    .update(`${job}:${idempotencyKey.trim()}`)
    .digest("hex")
    .slice(0, 40);
  const prefix = job.replace(/[^a-zA-Z0-9]+/g, "-").slice(0, 30);
  return `${prefix}-${hash}`;
}

function applyCheckpointIfNeeded(
  job: WorkerJobName,
  payload: unknown,
  requestedRunAt: Date,
  nowMs: number
): { effectivePayload: unknown; effectiveRunAt: Date } {
  if (job !== "crm.sequence.executeStep") {
    return { effectivePayload: payload, effectiveRunAt: requestedRunAt };
  }

  const horizonAt = new Date(nowMs + MAX_SCHEDULE_HORIZON_MS);
  if (requestedRunAt.getTime() <= horizonAt.getTime()) {
    return { effectivePayload: payload, effectiveRunAt: requestedRunAt };
  }

  if (
    typeof payload !== "object" ||
    payload === null ||
    typeof (payload as { enrollmentId?: unknown }).enrollmentId !== "string" ||
    typeof (payload as { stepId?: unknown }).stepId !== "string"
  ) {
    return { effectivePayload: payload, effectiveRunAt: horizonAt };
  }

  const stepPayload = payload as {
    enrollmentId: string;
    stepId: string;
    expectedRunAt?: string;
    tenantId?: string;
  };

  return {
    effectivePayload: {
      enrollmentId: stepPayload.enrollmentId,
      stepId: stepPayload.stepId,
      ...(stepPayload.expectedRunAt ? { expectedRunAt: stepPayload.expectedRunAt } : {}),
      ...(stepPayload.tenantId ? { tenantId: stepPayload.tenantId } : {}),
      checkpoint: true,
      originalRunAt: requestedRunAt.toISOString(),
    },
    effectiveRunAt: horizonAt,
  };
}

function readCloudTasksConfig(): {
  baseUrl: string;
  queuePath: string;
  locationPath: string;
  serviceAccountEmail?: string;
  serviceToken?: string;
} | null {
  const projectId = process.env.GCP_PROJECT_ID ?? process.env.GOOGLE_CLOUD_PROJECT;
  const location = process.env.GCP_LOCATION;
  const queueName = process.env.CLOUD_TASKS_QUEUE_NAME;
  const baseUrl = resolveApiBaseUrl();

  if (!projectId || !location || !queueName || !baseUrl) {
    return null;
  }

  const client = getTasksClient();
  return {
    baseUrl,
    queuePath: client.queuePath(projectId, location, queueName),
    locationPath: client.locationPath(projectId, location),
    serviceAccountEmail: process.env.CLOUD_TASKS_INVOKER_SERVICE_ACCOUNT_EMAIL ?? undefined,
    serviceToken: process.env.WORKER_API_SERVICE_TOKEN ?? undefined,
  };
}

function getTasksClient(): CloudTasksClient {
  if (!tasksClient) {
    tasksClient = new CloudTasksClient();
  }
  return tasksClient;
}

async function ensureQueue(
  client: CloudTasksClient,
  config: { queuePath: string; locationPath: string }
): Promise<void> {
  if (!queueInitPromise) {
    queueInitPromise = (async () => {
      try {
        await client.getQueue({ name: config.queuePath });
      } catch (error) {
        if (!isErrorCode(error, 5)) {
          throw error;
        }
        await client.createQueue({
          parent: config.locationPath,
          queue: { name: config.queuePath },
        });
      }
    })().catch((error) => {
      queueInitPromise = null;
      throw error;
    });
  }
  await queueInitPromise;
}

function isErrorCode(error: unknown, code: number): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    typeof (error as { code?: unknown }).code === "number" &&
    (error as { code: number }).code === code
  );
}
