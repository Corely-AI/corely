import { Injectable, NotFoundException, Inject } from "@nestjs/common";
import { UseCaseContext } from "./use-case-context";
import { TaxReportRepoPort, VatPeriodQueryPort, TaxProfileRepoPort } from "../../domain/ports";
import { VatPeriodResolver } from "../../domain/services/vat-period.resolver";
import { TaxPdfRenderer } from "../../infrastructure/pdf/tax-pdf-renderer";
import { GcsObjectStorageAdapter } from "../../../documents/infrastructure/storage/gcs/gcs-object-storage.adapter";
import { VatAccountingMethod } from "@corely/contracts";
import {
  WORKSPACE_REPOSITORY_PORT,
  type WorkspaceRepositoryPort,
} from "../../../workspaces/application/ports/workspace-repository.port";

@Injectable()
export class GenerateTaxReportPdfUseCase {
  constructor(
    private readonly reportRepo: TaxReportRepoPort,
    private readonly vatPeriodQuery: VatPeriodQueryPort,
    private readonly periodResolver: VatPeriodResolver,
    private readonly taxProfileRepo: TaxProfileRepoPort,
    private readonly pdfRenderer: TaxPdfRenderer,
    private readonly objectStorage: GcsObjectStorageAdapter,
    @Inject(WORKSPACE_REPOSITORY_PORT)
    private readonly workspaceRepo: WorkspaceRepositoryPort
  ) {}

  async execute(ctx: UseCaseContext, periodKey: string): Promise<{ downloadUrl: string }> {
    const period = this.periodResolver.resolveQuarter(periodKey);

    // 1. Find the report
    const reports = await this.reportRepo.listByPeriodRange(
      ctx.workspaceId,
      "VAT_ADVANCE", // Assumption: currently handling VAT Advance
      period.start,
      new Date(period.end.getTime() + 1000) // inclusive
    );

    // Find the exact match for this period
    const report = reports.find(
      (r) =>
        r.periodStart.getTime() === period.start.getTime() &&
        r.periodEnd.getTime() === period.end.getTime()
    );

    if (!report) {
      throw new NotFoundException("Tax report not found for this period");
    }

    // 2. Check if we already have a key
    if (report.pdfStorageKey) {
      const url = await this.objectStorage.createSignedDownloadUrl({
        tenantId: ctx.workspaceId,
        objectKey: report.pdfStorageKey,
        expiresInSeconds: 300, // 5 minutes
      });
      return { downloadUrl: url.url };
    }

    // 3. Generate PDF
    // We need to fetch details to populate the PDF
    const profile = await this.taxProfileRepo.getActive(ctx.workspaceId, new Date());
    const method = profile?.vatAccountingMethod ?? "IST";

    const workspace = await this.workspaceRepo.getWorkspaceByIdWithLegalEntity(
      ctx.tenantId,
      ctx.workspaceId
    );

    const inputs = await this.vatPeriodQuery.getInputs(
      ctx.workspaceId,
      period.start,
      period.end,
      method as VatAccountingMethod
    );

    const pdfBuffer = await this.pdfRenderer.render({
      title: "Advance VAT Declaration",
      tenantName: workspace?.legalEntity?.legalName ?? workspace?.name ?? "Unknown Business",
      periodLabel: period.label,
      periodStart: period.start,
      periodEnd: period.end,
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

    // 4. Upload
    const objectKey = `workspaces/${ctx.workspaceId}/tax-reports/${periodKey}.pdf`;
    await this.objectStorage.putObject({
      tenantId: ctx.workspaceId,
      objectKey,
      contentType: "application/pdf",
      bytes: pdfBuffer,
    });

    // 5. Update Report
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

    const url = await this.objectStorage.createSignedDownloadUrl({
      tenantId: ctx.workspaceId,
      objectKey,
      expiresInSeconds: 300,
    });
    return { downloadUrl: url.url };
  }

  private formatCurrency(cents: number): string {
    return new Intl.NumberFormat("de-DE", { style: "currency", currency: "EUR" }).format(
      cents / 100
    );
  }
}
