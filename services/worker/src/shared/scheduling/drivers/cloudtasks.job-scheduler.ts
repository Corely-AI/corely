import { createHash } from "node:crypto";
import { Injectable } from "@nestjs/common";
import { CloudTasksClient } from "@google-cloud/tasks";
import type {
  JobName,
  JobScheduleOptions,
  JobSchedulerPort,
  ScheduledJobRef,
} from "../job-scheduler.port";

const MAX_SCHEDULE_HORIZON_MS = 29 * 24 * 60 * 60 * 1000;

type CloudTasksJobSchedulerOptions = {
  projectId: string;
  location: string;
  queueName: string;
  workerBaseUrl: string;
  serviceAccountEmail?: string;
  workerKey?: string;
};

type ExecuteStepCheckpointPayload = {
  enrollmentId: string;
  stepId: string;
  expectedRunAt?: string;
  tenantId?: string;
  checkpoint: true;
  originalRunAt: string;
};

@Injectable()
export class CloudTasksJobScheduler implements JobSchedulerPort {
  private readonly client: CloudTasksClient;
  private readonly queuePath: string;
  private readonly locationPath: string;
  private readonly workerBaseUrl: string;
  private readonly serviceAccountEmail?: string;
  private readonly workerKey?: string;
  private ensureQueuePromise: Promise<void> | undefined;

  constructor(options: CloudTasksJobSchedulerOptions) {
    this.client = new CloudTasksClient();
    this.queuePath = this.client.queuePath(options.projectId, options.location, options.queueName);
    this.locationPath = this.client.locationPath(options.projectId, options.location);
    this.workerBaseUrl = options.workerBaseUrl.replace(/\/$/, "");
    this.serviceAccountEmail = options.serviceAccountEmail;
    this.workerKey = options.workerKey;
  }

  async schedule(
    job: JobName,
    payload: unknown,
    opts: JobScheduleOptions = {}
  ): Promise<ScheduledJobRef> {
    await this.ensureQueue();

    const now = Date.now();
    const requestedRunAt = opts.runAt ?? new Date(now);

    const { effectivePayload, effectiveRunAt } = this.applyCheckpointIfNeeded(
      job,
      payload,
      requestedRunAt,
      now
    );

    const targetUrl = new URL(this.pathForJob(job), `${this.workerBaseUrl}/`).toString();
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };
    if (this.workerKey) {
      headers["x-worker-key"] = this.workerKey;
    }

    const taskName =
      opts.idempotencyKey && opts.idempotencyKey.trim().length > 0
        ? `${this.queuePath}/tasks/${this.taskIdFor(job, opts.idempotencyKey)}`
        : undefined;

    const task: {
      name?: string;
      httpRequest: {
        httpMethod: "POST";
        url: string;
        headers: Record<string, string>;
        body: Buffer;
        oidcToken?: { serviceAccountEmail: string; audience?: string };
      };
      scheduleTime?: { seconds: number; nanos?: number };
    } = {
      ...(taskName ? { name: taskName } : {}),
      httpRequest: {
        httpMethod: "POST",
        url: targetUrl,
        headers,
        body: Buffer.from(JSON.stringify(effectivePayload)),
        ...(this.serviceAccountEmail
          ? {
              oidcToken: {
                serviceAccountEmail: this.serviceAccountEmail,
                audience: new URL(targetUrl).origin,
              },
            }
          : {}),
      },
    };

    if (effectiveRunAt.getTime() > now) {
      const runAtMs = effectiveRunAt.getTime();
      task.scheduleTime = {
        seconds: Math.floor(runAtMs / 1000),
        nanos: (runAtMs % 1000) * 1_000_000,
      };
    }

    try {
      const [created] = await this.client.createTask({
        parent: this.queuePath,
        task,
      });

      return {
        externalRef: created.name,
      };
    } catch (error: unknown) {
      if (taskName && this.isAlreadyExistsError(error)) {
        return { externalRef: taskName };
      }
      throw error;
    }
  }

  async cancel(externalRef: string): Promise<void> {
    await this.client.deleteTask({ name: externalRef });
  }

  async close(): Promise<void> {
    await this.client.close();
  }

  private applyCheckpointIfNeeded(
    job: JobName,
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

    const basePayload =
      isRecord(payload) && typeof payload.enrollmentId === "string" && typeof payload.stepId === "string"
        ? (payload as {
            enrollmentId: string;
            stepId: string;
            expectedRunAt?: string;
            tenantId?: string;
          })
        : undefined;

    if (!basePayload) {
      return {
        effectivePayload: payload,
        effectiveRunAt: horizonAt,
      };
    }

    const checkpointPayload: ExecuteStepCheckpointPayload = {
      enrollmentId: basePayload.enrollmentId,
      stepId: basePayload.stepId,
      ...(basePayload.expectedRunAt ? { expectedRunAt: basePayload.expectedRunAt } : {}),
      ...(basePayload.tenantId ? { tenantId: basePayload.tenantId } : {}),
      checkpoint: true,
      originalRunAt: requestedRunAt.toISOString(),
    };

    return {
      effectivePayload: checkpointPayload,
      effectiveRunAt: horizonAt,
    };
  }

  private pathForJob(job: JobName): string {
    switch (job) {
      case "worker.tick":
        return "/internal/tick";
      case "crm.sequence.executeStep":
        return "/internal/crm/sequences/execute-step";
      default:
        return assertNever(job);
    }
  }

  private taskIdFor(job: JobName, idempotencyKey: string): string {
    const normalized = idempotencyKey.trim();
    const hash = createHash("sha256").update(`${job}:${normalized}`).digest("hex").slice(0, 40);
    const prefix = job.replace(/[^a-zA-Z0-9]+/g, "-").slice(0, 30);
    return `${prefix}-${hash}`;
  }

  private isAlreadyExistsError(error: unknown): boolean {
    return (
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      typeof (error as { code?: unknown }).code === "number" &&
      (error as { code: number }).code === 6
    );
  }

  private async ensureQueue(): Promise<void> {
    if (!this.ensureQueuePromise) {
      this.ensureQueuePromise = this.initQueue();
    }
    await this.ensureQueuePromise;
  }

  private async initQueue(): Promise<void> {
    try {
      await this.client.getQueue({ name: this.queuePath });
    } catch (error: unknown) {
      if (!this.isNotFoundError(error)) {
        throw error;
      }
      await this.client.createQueue({
        parent: this.locationPath,
        queue: { name: this.queuePath },
      });
    }
  }

  private isNotFoundError(error: unknown): boolean {
    return (
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      typeof (error as { code?: unknown }).code === "number" &&
      (error as { code: number }).code === 5
    );
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function assertNever(value: never): never {
  throw new Error(`Unsupported job name: ${String(value)}`);
}
