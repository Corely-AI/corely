import { Body, Controller, Logger, Param, Post, UseGuards } from "@nestjs/common";
import { OutboxPollerService } from "./runtime/modules/outbox/outbox-poller.service";
import { InvoicePdfService } from "./runtime/modules/invoices/application/invoice-pdf.service";
import { BackgroundInternalGuard } from "./background-internal.guard";

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
    private readonly invoicePdfService: InvoicePdfService
  ) {}

  @Post("internal/background/outbox/run")
  async runOutbox(@Body() body: RunOutboxBody | undefined) {
    const limit = Number.isFinite(body?.limit) ? Math.max(1, Number(body?.limit)) : 50;
    const startedAt = new Date();

    const report = await this.outboxPoller.run({
      runId: `api-background-${Date.now()}`,
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
}
