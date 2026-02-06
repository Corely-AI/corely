import { Logger } from "@nestjs/common";
import type { EventHandler, OutboxEvent } from "../../outbox/event-handler.interface";
import type {
  TaxReportRepoPort,
  VatPeriodQueryPort,
  TaxProfileRepoPort,
} from "@/modules/tax/domain/ports";
import { type TaxPdfRenderer } from "../pdf/tax-pdf-renderer";
import type { WorkspaceRepositoryPort } from "@/modules/workspaces/application/ports/workspace-repository.port";
import type { ObjectStoragePort } from "@/modules/documents/application/ports/object-storage.port";
import type { VatAccountingMethod } from "@corely/contracts";

type Payload = {
  tenantId: string;
  workspaceId?: string | null;
  reportId: string;
};

export class TaxReportPdfRequestedHandler implements EventHandler {
  readonly eventType = "tax.report.pdf.requested";
  private readonly logger = new Logger(TaxReportPdfRequestedHandler.name);

  constructor(
    private readonly reportRepo: TaxReportRepoPort,
    private readonly vatPeriodQuery: VatPeriodQueryPort,
    private readonly taxProfileRepo: TaxProfileRepoPort,
    private readonly pdfRenderer: TaxPdfRenderer,
    private readonly objectStorage: ObjectStoragePort,
    private readonly workspaceRepo: WorkspaceRepositoryPort
  ) {}

  async handle(event: OutboxEvent): Promise<void> {
    const payload = event.payload as Payload;
    const tenantId = payload?.tenantId ?? event.tenantId;
    if (!tenantId || !payload?.reportId) {
      this.logger.error("tax_report_pdf.invalid_payload", { payload });
      return;
    }
    const workspaceId = payload.workspaceId ?? tenantId;

    const report = await this.reportRepo.findById(workspaceId, payload.reportId);
    if (!report) {
      this.logger.error("tax_report_pdf.not_found", { reportId: payload.reportId, tenantId });
      return;
    }

    if (report.pdfStorageKey) {
      return;
    }

    const periodStart = report.periodStart;
    const periodEnd = report.periodEnd;
    const periodLabel = report.periodLabel;

    const profile = await this.taxProfileRepo.getActive(workspaceId, new Date());
    const method = profile?.vatAccountingMethod ?? "IST";

    const workspace = await this.workspaceRepo.getWorkspaceByIdWithLegalEntity(
      tenantId,
      workspaceId
    );

    const inputs = await this.vatPeriodQuery.getInputs(
      workspaceId,
      periodStart,
      periodEnd,
      method as VatAccountingMethod
    );

    const pdfBuffer = await this.pdfRenderer.render({
      title: "Advance VAT Declaration",
      tenantName: workspace?.legalEntity?.legalName ?? workspace?.name ?? "Unknown Business",
      periodLabel,
      periodStart,
      periodEnd,
      generatedAt: new Date(),
      items: [
        { label: "Sales (Net)", value: this.formatCurrency(inputs.salesNetCents) },
        { label: "Sales VAT", value: this.formatCurrency(inputs.salesVatCents) },
        { label: "Purchases (Net)", value: this.formatCurrency(inputs.purchaseNetCents) },
        { label: "Purchase VAT", value: this.formatCurrency(inputs.purchaseVatCents) },
        {
          label: "Tax Due",
          value: this.formatCurrency(inputs.salesVatCents - inputs.purchaseVatCents),
        },
      ],
      submission: report.submittedAt
        ? {
            date: report.submittedAt,
            reference: report.submissionReference,
          }
        : undefined,
    });

    const filenameKey = periodLabel.replace(/\s/g, "-");
    const objectKey = `workspaces/${workspaceId}/tax-reports/${filenameKey}.pdf`;
    await this.objectStorage.putObject({
      tenantId: workspaceId,
      objectKey,
      contentType: "application/pdf",
      bytes: pdfBuffer,
    });

    await this.reportRepo.upsertByPeriod({
      tenantId: report.tenantId,
      type: report.type,
      group: report.group,
      periodLabel: report.periodLabel,
      periodStart: report.periodStart,
      periodEnd: report.periodEnd,
      dueDate: report.dueDate,
      status: report.status,
      amountFinalCents: report.amountFinalCents,
      submissionReference: report.submissionReference,
      submissionNotes: report.submissionNotes,
      archivedReason: report.archivedReason,
      submittedAt: report.submittedAt,
      pdfStorageKey: objectKey,
    });
  }

  private formatCurrency(cents: number): string {
    return new Intl.NumberFormat("de-DE", { style: "currency", currency: "EUR" }).format(
      cents / 100
    );
  }
}
