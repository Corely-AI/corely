import {
  BadRequestException,
  Body,
  Controller,
  Headers,
  Param,
  Post,
  UnauthorizedException,
  Inject,
} from "@nestjs/common";
import { InvoicePdfService } from "../modules/invoices/application/invoice-pdf.service";
import { TickOrchestrator } from "./tick-orchestrator.service";
import {
  JOB_SCHEDULER_PORT,
  type JobName,
  type JobSchedulerPort,
} from "../shared/scheduling/job-scheduler.port";

@Controller("internal")
export class InternalWorkerController {
  constructor(
    private readonly invoicePdfService: InvoicePdfService,
    private readonly tickOrchestrator: TickOrchestrator,
    @Inject(JOB_SCHEDULER_PORT) private readonly jobScheduler: JobSchedulerPort
  ) {}

  @Post("invoices/:invoiceId/pdf")
  async generateInvoicePdf(
    @Param("invoiceId") invoiceId: string,
    @Body() body: { tenantId: string },
    @Headers("x-worker-key") workerKey: string
  ) {
    this.assertWorkerAuth(workerKey);

    return await this.invoicePdfService.generateAndStore({
      tenantId: body.tenantId,
      invoiceId,
    });
  }

  @Post("tick")
  async triggerTick(
    @Body() body: { runnerNames?: string[] } | undefined,
    @Headers("x-worker-key") workerKey: string
  ) {
    this.assertWorkerAuth(workerKey);

    const summary = await this.tickOrchestrator.runOnce({
      runnerNames: body?.runnerNames,
    });

    return {
      runId: summary.runId,
      totalProcessed: summary.totalProcessed,
      totalErrors: summary.totalErrors,
      durationMs: summary.durationMs,
      startedAt: summary.startedAt.toISOString(),
      finishedAt: summary.finishedAt.toISOString(),
    };
  }

  @Post("schedule")
  async schedule(
    @Body()
    body:
      | {
          jobName?: JobName;
          payload?: unknown;
          runAt?: string;
          idempotencyKey?: string;
          traceId?: string;
        }
      | undefined,
    @Headers("x-worker-key") workerKey: string
  ) {
    this.assertWorkerAuth(workerKey);

    if (!body?.jobName || !isJobName(body.jobName)) {
      throw new BadRequestException("jobName is required");
    }

    const runAt = parseRunAt(body.runAt);
    const scheduled = await this.jobScheduler.schedule(body.jobName, body.payload ?? {}, {
      ...(runAt ? { runAt } : {}),
      ...(body.idempotencyKey ? { idempotencyKey: body.idempotencyKey } : {}),
      ...(body.traceId ? { traceId: body.traceId } : {}),
    });

    return {
      jobName: body.jobName,
      scheduled: true,
      externalRef: scheduled.externalRef,
    };
  }

  private assertWorkerAuth(workerKey: string) {
    const expectedKey = process.env.INTERNAL_WORKER_KEY;
    if (expectedKey && workerKey !== expectedKey) {
      throw new UnauthorizedException("Invalid worker key");
    }
  }
}

function parseRunAt(raw: string | undefined): Date | undefined {
  if (!raw) {
    return undefined;
  }
  const date = new Date(raw);
  if (Number.isNaN(date.getTime())) {
    throw new BadRequestException("runAt must be a valid ISO datetime");
  }
  return date;
}

function isJobName(value: string): value is JobName {
  return value === "worker.tick" || value === "crm.sequence.executeStep";
}
