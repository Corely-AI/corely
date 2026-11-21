import {
  BadRequestException,
  Controller,
  ForbiddenException,
  Headers,
  HttpCode,
  Inject,
  NotFoundException,
  Post,
  Body,
} from "@nestjs/common";
import { EnvService } from "@corely/config";
import type { QueueJob, QueuePort } from "@corely/kernel";
import {
  WORKFLOW_ORCHESTRATOR_QUEUE_ROUTE,
  WORKFLOW_ORCHESTRATOR_QUEUE_PORT,
  WORKFLOW_TASK_QUEUE_ROUTE,
  WORKFLOW_TASK_QUEUE_PORT,
  type WorkflowOrchestratorQueuePayload,
  type WorkflowTaskQueuePayload,
} from "@corely/contracts";
import { WorkflowOrchestratorProcessor } from "./orchestrator.processor";
import { WorkflowTaskRunnerProcessor } from "./task-runner.processor";
import { VercelWorkflowQueueAdapter } from "@/shared/infrastructure/vercel-workflow-queue.adapter";

type CloudTasksEnvelope<T> = {
  data?: T;
  jobId?: string;
  enqueuedAt?: number;
  maxAttempts?: number;
};

@Controller()
export class WorkflowQueueController {
  constructor(
    private readonly env: EnvService,
    private readonly orchestrator: WorkflowOrchestratorProcessor,
    private readonly taskRunner: WorkflowTaskRunnerProcessor,
    @Inject(WORKFLOW_ORCHESTRATOR_QUEUE_PORT)
    private readonly orchestratorQueue: QueuePort<WorkflowOrchestratorQueuePayload>,
    @Inject(WORKFLOW_TASK_QUEUE_PORT)
    private readonly taskQueue: QueuePort<WorkflowTaskQueuePayload>
  ) {}

  @Post("internal/queues/vercel/poll")
  @HttpCode(200)
  async pollVercelWorkflows(@Headers("x-service-token") token: string | undefined) {
    if (
      !(this.orchestratorQueue instanceof VercelWorkflowQueueAdapter) ||
      !(this.taskQueue instanceof VercelWorkflowQueueAdapter)
    ) {
      throw new NotFoundException();
    }
    if (!this.env.WORKER_API_SERVICE_TOKEN || token !== this.env.WORKER_API_SERVICE_TOKEN) {
      throw new ForbiddenException();
    }
    const [orchestrator, taskRunner] = await Promise.all([
      this.orchestratorQueue.poll((job) => this.orchestrator.handleJob(job)),
      this.taskQueue.poll((job) => this.taskRunner.handleJob(job)),
    ]);
    return { orchestrator, taskRunner };
  }

  @Post(WORKFLOW_ORCHESTRATOR_QUEUE_ROUTE)
  @HttpCode(204)
  async handleOrchestrator(
    @Body() body: CloudTasksEnvelope<WorkflowOrchestratorQueuePayload>,
    @Headers() headers: Record<string, string | string[] | undefined>
  ) {
    this.assertSecret(headers);
    const job = this.toQueueJob(body, headers);
    if (!job) {
      throw new BadRequestException("Invalid orchestrator payload");
    }
    if (this.shouldSkip(job)) {
      return;
    }
    await this.orchestrator.handleJob(job);
  }

  @Post(WORKFLOW_TASK_QUEUE_ROUTE)
  @HttpCode(204)
  async handleTask(
    @Body() body: CloudTasksEnvelope<WorkflowTaskQueuePayload>,
    @Headers() headers: Record<string, string | string[] | undefined>
  ) {
    this.assertSecret(headers);
    const job = this.toQueueJob(body, headers);
    if (!job) {
      throw new BadRequestException("Invalid task payload");
    }
    if (this.shouldSkip(job)) {
      return;
    }
    await this.taskRunner.handleJob(job);
  }

  private assertSecret(headers: Record<string, string | string[] | undefined>) {
    if (this.env.getValue("WORKFLOW_QUEUE_DRIVER") === "vercel") {
      throw new NotFoundException();
    }
    const expected = this.env.WORKFLOW_QUEUE_SECRET;
    if (!expected) {
      return;
    }
    const provided = this.headerValue(headers, "x-queue-secret");
    if (provided !== expected) {
      throw new ForbiddenException();
    }
  }

  private shouldSkip(job: QueueJob<unknown>): boolean {
    return job.maxAttempts > 0 && job.attemptsMade >= job.maxAttempts;
  }

  private toQueueJob<T>(
    body: CloudTasksEnvelope<T>,
    headers: Record<string, string | string[] | undefined>
  ): QueueJob<T> | null {
    if (!body || !body.data) {
      return null;
    }

    const retryCount = Number(this.headerValue(headers, "x-cloudtasks-taskretrycount") ?? 0);
    const attemptsMade = Number.isFinite(retryCount) ? retryCount : 0;
    const maxAttempts = body.maxAttempts ?? 1;

    return {
      id: body.jobId ?? this.headerValue(headers, "x-cloudtasks-taskname") ?? undefined,
      timestamp: body.enqueuedAt ?? Date.now(),
      data: body.data,
      attemptsMade,
      maxAttempts,
    };
  }

  private headerValue(
    headers: Record<string, string | string[] | undefined>,
    name: string
  ): string | undefined {
    const value = headers[name];
    if (Array.isArray(value)) {
      return value[0];
    }
    return value;
  }
}
