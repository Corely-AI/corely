import { EnvService } from "@corely/config";
import { RecurringGenerationUseCase } from "../tasks/public";
import { Body, Controller, Logger, Param, Post, UseGuards } from "@nestjs/common";
import { OutboxPollerService } from "./runtime/modules/outbox/outbox-poller.service";
import { InvoicePdfService } from "./runtime/modules/invoices/application/invoice-pdf.service";
import { TrialExpiryRunnerService } from "./runtime/modules/billing/trial-expiry-runner.service";
import { BackgroundInternalGuard } from "./background-internal.guard";
import { CoachingPrepReminderRunnerService } from "./runtime/modules/coaching/coaching-prep-reminder-runner.service";

type RunOutboxBody = {
  limit?: number;
};

type GenerateInvoicePdfBody = {
  tenantId: string;
};

@Controller()
@UseGuards(BackgroundInternalGuard)
export class BackgroundInternalController {
  constructor(
    private readonly outboxPoller: OutboxPollerService,
    private readonly invoicePdfService: InvoicePdfService,
    private readonly trialExpiryRunner: TrialExpiryRunnerService,
    private readonly coachingPrepRunner: CoachingPrepReminderRunnerService,
    private readonly recurringTasks: RecurringGenerationUseCase,
    private readonly env: EnvService
  ) {}

  @Post("internal/background/outbox/run")
  async runOutbox(@Body() body: RunOutboxBody | undefined) {
    const limit = Number.isFinite(body?.limit) ? Math.max(1, Number(body?.limit)) : 50;
    const startedAt = new Date();

    const outboxReport = await this.outboxPoller.run({
      runId: `api-background-${Date.now()}`,
      startedAt,
      budgets: {
        overallMaxMs: 120_000,
        perRunnerMaxMs: 120_000,
        perRunnerMaxItems: limit,
      },
      logger: new Logger(BackgroundInternalController.name),
    });
    const coachingPrepReport = await this.coachingPrepRunner.run({
      runId: `api-background-coaching-prep-${Date.now()}`,
      startedAt: new Date(),
      budgets: {
        overallMaxMs: 120_000,
        perRunnerMaxMs: 120_000,
        perRunnerMaxItems: limit,
      },
      logger: new Logger(BackgroundInternalController.name),
    });

    // Legacy ticks without configured service credentials must not acquire new write authority.
    const recurringReport =
      this.env.WORKER_API_SERVICE_TOKEN || process.env.INTERNAL_WORKER_KEY
        ? await this.recurringTasks.run(Math.min(25, limit), 30000)
        : { processedCount: 0, updatedCount: 0, skippedCount: 0, errorCount: 0, durationMs: 0 };
    return {
      recurringTasks: recurringReport,
      processedCount:
        recurringReport.processedCount +
        outboxReport.processedCount +
        coachingPrepReport.processedCount,
      updatedCount:
        recurringReport.updatedCount + outboxReport.updatedCount + coachingPrepReport.updatedCount,
      skippedCount:
        recurringReport.skippedCount + outboxReport.skippedCount + coachingPrepReport.skippedCount,
      errorCount:
        recurringReport.errorCount + outboxReport.errorCount + coachingPrepReport.errorCount,
      durationMs:
        recurringReport.durationMs + outboxReport.durationMs + coachingPrepReport.durationMs,
      outbox: outboxReport,
      coachingPrep: coachingPrepReport,
    };
  }

  @Post("internal/background/coaching/prep/run")
  async runCoachingPrep(@Body() body: RunOutboxBody | undefined) {
    const limit = Number.isFinite(body?.limit) ? Math.max(1, Number(body?.limit)) : 50;
    const startedAt = new Date();
    const report = await this.coachingPrepRunner.run({
      runId: `api-background-coaching-prep-${Date.now()}`,
      startedAt,
      budgets: {
        overallMaxMs: 120_000,
        perRunnerMaxMs: 120_000,
        perRunnerMaxItems: limit,
      },
      logger: new Logger(BackgroundInternalController.name),
    });

    return {
      processedCount: report.processedCount,
      updatedCount: report.updatedCount,
      skippedCount: report.skippedCount,
      errorCount: report.errorCount,
      durationMs: report.durationMs,
    };
  }

  @Post("internal/invoices/:invoiceId/pdf")
  async generateInvoicePdf(
    @Param("invoiceId") invoiceId: string,
    @Body() body: GenerateInvoicePdfBody
  ) {
    return await this.invoicePdfService.generateAndStore({
      tenantId: body.tenantId,
      invoiceId,
    });
  }

  @Post("internal/background/billing/trials/expire")
  async expireTrials(@Body() body: RunOutboxBody | undefined) {
    const limit = Number.isFinite(body?.limit) ? Math.max(1, Number(body?.limit)) : 100;
    const startedAt = new Date();
    const report = await this.trialExpiryRunner.run({
      runId: `api-background-billing-trials-${Date.now()}`,
      startedAt,
      budgets: {
        overallMaxMs: 120_000,
        perRunnerMaxMs: 120_000,
        perRunnerMaxItems: limit,
      },
      logger: new Logger(BackgroundInternalController.name),
    });

    return {
      processedCount: report.processedCount,
      updatedCount: report.updatedCount,
      skippedCount: report.skippedCount,
      errorCount: report.errorCount,
      durationMs: report.durationMs,
    };
  }
}
