import { Inject, Injectable } from "@nestjs/common";
import type { TaxElsterGatewayRequest } from "@corely/contracts";
import { EnvService } from "@corely/config";
import {
  TAX_FILING_EXPORT_BUILDER_PORT,
  type TaxFilingExportBuilderPort,
} from "../../application/ports/tax-filing-export-builder.port";
import {
  TaxElsterSubmissionBuilderPort,
  type TaxElsterSubmissionBuilderInput,
} from "../../application/ports/tax-elster-submission-builder.port";
import { buildTaxFilingExportInput } from "../../application/use-cases/tax-filing-export.utils";

@Injectable()
export class DeUstvaElsterSubmissionBuilder extends TaxElsterSubmissionBuilderPort {
  constructor(
    @Inject(TAX_FILING_EXPORT_BUILDER_PORT)
    private readonly exportBuilder: TaxFilingExportBuilderPort,
    private readonly env: EnvService
  ) {
    super();
  }

  build(input: TaxElsterSubmissionBuilderInput): TaxElsterGatewayRequest {
    const exportInput = buildTaxFilingExportInput(input.filing, "DE");
    const kennzifferRows = this.exportBuilder.buildKennzifferMap(exportInput);
    const taxYear =
      input.filing.year ?? input.report.periodStart.getUTCFullYear() ?? new Date().getUTCFullYear();

    return {
      requestId: input.requestId,
      jobId: input.requestId,
      correlationId: input.correlationId,
      tenantId: input.tenantId,
      workspaceId: input.workspaceId,
      filingId: input.filing.id,
      reportId: input.report.id,
      reportType: input.reportType,
      declarationType: "de-ustva",
      operation: input.operation,
      payloadVersion: "de-ustva-v2026.1",
      certificateReferenceId: this.env.ELSTER_GATEWAY_DEFAULT_CERTIFICATE_REF,
      period: {
        taxYear,
        filingPeriodKey: input.filing.periodKey ?? input.filing.periodLabel,
        periodStart: input.report.periodStart.toISOString(),
        periodEnd: input.report.periodEnd.toISOString(),
      },
      payload: {
        declarationType: "de-ustva",
        payloadVersion: "de-ustva-v2026.1",
        jurisdiction: "DE",
        filingType: "vat",
        currency: exportInput.currency,
        periodLabel: input.filing.periodLabel,
        totals: {
          vatCollectedCents: exportInput.vatCollectedCents,
          vatPaidCents: exportInput.vatPaidCents,
          netPayableCents: exportInput.netPayableCents,
          salesNetCents: exportInput.salesNetCents,
          purchaseNetCents: exportInput.purchaseNetCents,
        },
        kennzifferRows,
      },
      metadata: {
        source: "corely-tax",
        actorUserId: input.actorUserId,
        idempotencyKey: input.idempotencyKey,
        requestId: input.requestId,
        correlationId: input.correlationId,
        requestedAt: new Date().toISOString(),
        raw: {
          filingType: input.filing.type,
          filingStatus: input.filing.status,
        },
      },
    };
  }
}
