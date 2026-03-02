import { Controller, Post, Param, Body, Headers, UnauthorizedException } from "@nestjs/common";
import { InvoicePdfService } from "../modules/invoices/application/invoice-pdf.service";
import { TickOrchestrator } from "./tick-orchestrator.service";

@Controller("internal")
export class InternalWorkerController {
  constructor(
    private readonly invoicePdfService: InvoicePdfService,
    private readonly tickOrchestrator: TickOrchestrator
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

  private assertWorkerAuth(workerKey: string) {
    const expectedKey = process.env.INTERNAL_WORKER_KEY;
    if (expectedKey && workerKey !== expectedKey) {
      throw new UnauthorizedException("Invalid worker key");
    }
  }
}
