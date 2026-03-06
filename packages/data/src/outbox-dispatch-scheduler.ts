import { createHash } from "node:crypto";
import { CloudTasksClient } from "@google-cloud/tasks";

type ScheduleOutboxDispatchInput = {
  runAt?: Date;
};

const DEFAULT_DELAY_MS = 3_000;
const DEFAULT_BUCKET_MS = 5_000;
const DEFAULT_ENDPOINT_PATH = "/internal/background/outbox/run";

let client: CloudTasksClient | null = null;
let queueInitPromise: Promise<void> | null = null;

export async function scheduleOutboxDispatch(
  input: ScheduleOutboxDispatchInput = {}
): Promise<boolean> {
  if (resolveDispatchDriver() !== "cloudtasks") {
    return false;
  }

  const config = readConfig();
  if (!config) {
    return false;
  }

  const runAt = resolveRunAt(input.runAt);
  const taskId = buildTaskId(runAt, config.bucketMs);
  const targetUrl = new URL(
    DEFAULT_ENDPOINT_PATH,
    ensureTrailingSlash(config.apiBaseUrl)
  ).toString();

  const task: Parameters<CloudTasksClient["createTask"]>[0]["task"] = {
    name: `${config.queuePath}/tasks/${taskId}`,
    httpRequest: {
      httpMethod: "POST",
      url: targetUrl,
      headers: {
        "Content-Type": "application/json",
        ...(config.serviceToken ? { "x-service-token": config.serviceToken } : {}),
      },
      body: Buffer.from(JSON.stringify({})),
      ...(config.serviceAccountEmail
        ? {
            oidcToken: {
              serviceAccountEmail: config.serviceAccountEmail,
              audience: new URL(targetUrl).origin,
            },
          }
        : {}),
    },
    scheduleTime: {
      seconds: Math.floor(runAt.getTime() / 1000),
      nanos: (runAt.getTime() % 1000) * 1_000_000,
    },
  };

  const tasksClient = getClient();
  await ensureQueue(tasksClient, config);

  try {
    await tasksClient.createTask({
      parent: config.queuePath,
      task,
    });
    return true;
  } catch (error) {
    if (isAlreadyExistsError(error)) {
      return true;
    }
    return false;
  }
}

function resolveDispatchDriver(): string {
  return (
    process.env.OUTBOX_DISPATCH_DRIVER ??
    process.env.OUTBOX_DELIVERY_DRIVER ??
    process.env.JOB_SCHEDULER_DRIVER ??
    "disabled"
  );
}

function resolveRunAt(runAt: Date | undefined): Date {
  const dispatchDelayMs = readPositiveInt(process.env.OUTBOX_DISPATCH_DELAY_MS, DEFAULT_DELAY_MS);
  const baseTime = runAt?.getTime() ?? Date.now();
  return new Date(baseTime + dispatchDelayMs);
}

function buildTaskId(runAt: Date, bucketMs: number): string {
  const bucket = Math.floor(runAt.getTime() / bucketMs);
  const hash = createHash("sha256").update(`outbox:${bucket}`).digest("hex").slice(0, 32);
  return `outbox-dispatch-${hash}`;
}

function readConfig(): {
  apiBaseUrl: string;
  queuePath: string;
  serviceAccountEmail?: string;
  serviceToken?: string;
  bucketMs: number;
  locationPath: string;
  queueName: string;
  projectId: string;
  location: string;
} | null {
  const projectId = process.env.GCP_PROJECT_ID ?? process.env.GOOGLE_CLOUD_PROJECT;
  const location = process.env.GCP_LOCATION;
  const queueName = process.env.CLOUD_TASKS_QUEUE_NAME;
  const apiBaseUrl = process.env.API_BASE_URL ?? process.env.INTERNAL_API_URL;

  if (!projectId || !location || !queueName || !apiBaseUrl) {
    return null;
  }

  const tasksClient = getClient();
  const serviceAccountEmail = process.env.CLOUD_TASKS_INVOKER_SERVICE_ACCOUNT_EMAIL;
  const serviceToken = process.env.WORKER_API_SERVICE_TOKEN;

  return {
    apiBaseUrl,
    queuePath: tasksClient.queuePath(projectId, location, queueName),
    locationPath: tasksClient.locationPath(projectId, location),
    bucketMs: readPositiveInt(process.env.OUTBOX_DISPATCH_BUCKET_MS, DEFAULT_BUCKET_MS),
    queueName,
    projectId,
    location,
    ...(serviceAccountEmail ? { serviceAccountEmail } : {}),
    ...(serviceToken ? { serviceToken } : {}),
  };
}

function getClient(): CloudTasksClient {
  if (!client) {
    client = new CloudTasksClient();
  }
  return client;
}

async function ensureQueue(
  tasksClient: CloudTasksClient,
  config: {
    queuePath: string;
    locationPath: string;
    queueName: string;
  }
): Promise<void> {
  if (!queueInitPromise) {
    queueInitPromise = (async () => {
      try {
        await tasksClient.getQueue({ name: config.queuePath });
      } catch (error) {
        if (!isNotFoundError(error)) {
          throw error;
        }
        await tasksClient.createQueue({
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

function readPositiveInt(raw: string | undefined, fallback: number): number {
  const parsed = Number.parseInt(raw ?? "", 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function ensureTrailingSlash(value: string): string {
  return value.endsWith("/") ? value : `${value}/`;
}

function isAlreadyExistsError(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    typeof (error as { code?: unknown }).code === "number" &&
    (error as { code: number }).code === 6
  );
}

function isNotFoundError(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    typeof (error as { code?: unknown }).code === "number" &&
    (error as { code: number }).code === 5
  );
}
