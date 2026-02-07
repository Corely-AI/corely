import { Inject, Injectable, NotFoundException } from "@nestjs/common";
import {
  BaseUseCase,
  type Result,
  type UseCaseContext,
  type UseCaseError,
  ok,
  RequireTenant,
} from "@corely/kernel";
import type { RequestTaxReportPdfOutput } from "@corely/contracts";
import { VatPeriodResolver } from "../../domain/services/vat-period.resolver";
import { TaxReportRepoPort } from "../../domain/ports";
import { GcsObjectStorageAdapter } from "../../../documents/infrastructure/storage/gcs/gcs-object-storage.adapter";
import { OUTBOX_PORT, type OutboxPort } from "@corely/kernel";

export interface RequestTaxReportPdfInput {
  periodKey?: string;
  reportId?: string;
}

@RequireTenant()
@Injectable()
export class RequestTaxReportPdfUseCase extends BaseUseCase<
  RequestTaxReportPdfInput,
  RequestTaxReportPdfOutput
> {
  constructor(
    private readonly reportRepo: TaxReportRepoPort,
    private readonly periodResolver: VatPeriodResolver,
    @Inject(OUTBOX_PORT) private readonly outbox: OutboxPort,
    private readonly objectStorage: GcsObjectStorageAdapter
  ) {
    super({ logger: null as any });
  }

  protected async handle(
    input: RequestTaxReportPdfInput,
    ctx: UseCaseContext
  ): Promise<Result<RequestTaxReportPdfOutput, UseCaseError>> {
    const tenantId = ctx.tenantId!;
    const workspaceId = ctx.workspaceId || tenantId;

    let report: any;
    if (input.reportId) {
      report = await this.reportRepo.findById(workspaceId, input.reportId);
      if (!report) {
        throw new NotFoundException("Tax report not found");
      }
    } else if (input.periodKey) {
      const period = this.periodResolver.resolveQuarter(input.periodKey);
      const reports = await this.reportRepo.listByPeriodRange(
        workspaceId,
        "VAT_ADVANCE",
        period.start,
        new Date(period.end.getTime() + 1000)
      );
      report = reports.find(
        (r: any) =>
          r.periodStart.getTime() === period.start.getTime() &&
          r.periodEnd.getTime() === period.end.getTime()
      );
      if (!report) {
        throw new NotFoundException("Tax report not found for this period");
      }
    } else {
      throw new Error("Either periodKey or reportId must be provided");
    }

    if (report.pdfStorageKey) {
      const url = await this.objectStorage.createSignedDownloadUrl({
        tenantId: workspaceId,
        objectKey: report.pdfStorageKey,
        expiresInSeconds: 300,
      });
      return ok({ status: "READY", downloadUrl: url.url, expiresAt: url.expiresAt.toISOString() });
    }

    await this.outbox.enqueue({
      tenantId: workspaceId,
      eventType: "tax.report.pdf.requested",
      payload: {
        tenantId,
        workspaceId,
        reportId: report.id,
      },
      correlationId: ctx.correlationId,
    });

    return ok({ status: "PENDING" });
  }
}
