import { createHash } from "node:crypto";
import { Logger } from "@nestjs/common";
import { PollingQueueClient } from "@vercel/queue";
import type { QueueBackoff, QueueEnqueueOptions, QueueHandler, QueuePort } from "@corely/kernel";

type WorkflowMessage<T> = {
  version: 1;
  data: T;
  jobId?: string;
  timestamp: number;
  maxAttempts: number;
  backoff?: QueueBackoff;
};

class DeliveryError extends Error {
  constructor(
    readonly messageOptions: Pick<WorkflowMessage<unknown>, "backoff" | "maxAttempts">,
    cause: unknown
  ) {
    super("Workflow delivery failed", { cause });
  }
}

export class VercelWorkflowQueueAdapter<T extends { tenantId: string }> implements QueuePort<T> {
  private readonly logger = new Logger(VercelWorkflowQueueAdapter.name);

  constructor(
    private readonly topic: string,
    private readonly client: PollingQueueClient
  ) {}

  async enqueue(data: T, options: QueueEnqueueOptions = {}): Promise<void> {
    const message: WorkflowMessage<T> = {
      version: 1,
      data,
      jobId: options.jobId,
      timestamp: Date.now(),
      maxAttempts: options.attempts ?? 1,
      backoff: options.backoff,
    };
    await this.client.send(this.topic, message, {
      delaySeconds: Math.ceil((options.delayMs ?? 0) / 1000),
      ...(options.jobId && {
        idempotencyKey: createHash("sha256")
          .update(JSON.stringify([data.tenantId, options.jobId]))
          .digest("hex"),
      }),
    });
  }

  async poll(handler: QueueHandler<T>) {
    return this.client.receive<WorkflowMessage<T>>(
      this.topic,
      "corely-workflows-v1",
      async (message, delivery) => {
        if (message.version !== 1) {
          throw new Error("Unsupported workflow queue message version");
        }
        if (delivery.deliveryCount > message.maxAttempts) {
          this.logger.error({
            message: "Workflow delivery attempts exhausted",
            id: delivery.messageId,
          });
          return;
        }
        try {
          await handler({
            id: message.jobId ?? delivery.messageId,
            data: message.data,
            timestamp: message.timestamp,
            attemptsMade: delivery.deliveryCount - 1,
            maxAttempts: message.maxAttempts,
          });
        } catch (error) {
          throw new DeliveryError(message, error);
        }
      },
      {
        limit: 1,
        visibilityTimeoutSeconds: 300,
        cursorFallback: "earliest",
        retry: (error, delivery) => {
          if (!(error instanceof DeliveryError)) {
            return;
          }
          const { maxAttempts, backoff } = error.messageOptions;
          if (delivery.deliveryCount >= maxAttempts) {
            this.logger.error({
              message: "Workflow delivery attempts exhausted",
              id: delivery.messageId,
            });
            return { acknowledge: true };
          }
          const multiplier =
            backoff?.type === "exponential" ? 2 ** (delivery.deliveryCount - 1) : 1;
          const seconds = Math.ceil(((backoff?.delayMs ?? 60_000) * multiplier) / 1000);
          return { afterSeconds: Math.max(1, Math.min(3600, seconds)) };
        },
      }
    );
  }

  async subscribe(): Promise<never> {
    throw new Error("Vercel Queues uses scheduled polling.");
  }

  async close(): Promise<void> {}
}

export function createVercelWorkflowQueue<T extends { tenantId: string }>(
  name: string,
  region: string | undefined,
  namespace: string | undefined,
  serviceToken: string | undefined
) {
  if (!region || !namespace || !serviceToken) {
    throw new Error(
      "VERCEL_WORKFLOW_QUEUE_REGION, VERCEL_WORKFLOW_QUEUE_NAMESPACE and WORKER_API_SERVICE_TOKEN are required for Vercel Queues"
    );
  }
  return new VercelWorkflowQueueAdapter<T>(
    `${namespace}-${name}`,
    new PollingQueueClient({ region, deploymentId: null })
  );
}
