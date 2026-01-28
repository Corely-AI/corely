import { Injectable, NotFoundException, Inject } from "@nestjs/common";
import { TaxReportRepoPort, VatPeriodQueryPort, TaxProfileRepoPort } from "../../domain/ports";
import { VatPeriodResolver } from "../../domain/services/vat-period.resolver";
import { TaxPdfRenderer } from "../../infrastructure/pdf/tax-pdf-renderer";
import { GcsObjectStorageAdapter } from "../../../documents/infrastructure/storage/gcs/gcs-object-storage.adapter";
import { VatAccountingMethod } from "@corely/contracts";
import {
  WORKSPACE_REPOSITORY_PORT,
  type WorkspaceRepositoryPort,
} from "../../../workspaces/application/ports/workspace-repository.port";
import {
  BaseUseCase,
  type Result,
  type UseCaseContext,
  type UseCaseError,
  ok,
  RequireTenant,
} from "@corely/kernel";

export interface GenerateTaxReportPdfInput {
  periodKey?: string;
  reportId?: string;
}

@RequireTenant()
@Injectable()
export class GenerateTaxReportPdfUseCase extends BaseUseCase<
  GenerateTaxReportPdfInput,
  { downloadUrl: string }
> {
  constructor(
    private readonly reportRepo: TaxReportRepoPort,
    private readonly vatPeriodQuery: VatPeriodQueryPort,
    private readonly periodResolver: VatPeriodResolver,
    private readonly taxProfileRepo: TaxProfileRepoPort,
    private readonly pdfRenderer: TaxPdfRenderer,
    private readonly objectStorage: GcsObjectStorageAdapter,
    @Inject(WORKSPACE_REPOSITORY_PORT)
    private readonly workspaceRepo: WorkspaceRepositoryPort
  ) {
    super({ logger: null as any });
  }

  protected async handle(
    input: GenerateTaxReportPdfInput,
    ctx: UseCaseContext
  ): Promise<Result<{ downloadUrl: string }, UseCaseError>> {
    const tenantId = ctx.tenantId!;
    const workspaceId = ctx.workspaceId || tenantId;
    let report: any;
    let periodStart: Date;
    let periodEnd: Date;
    let periodLabel: string;

    if (input.reportId) {
      const r = await this.reportRepo.findById(workspaceId, input.reportId);
      if (!r) {
        throw new NotFoundException("Tax report not found");
      }
      report = r;
      periodStart = r.periodStart;
      periodEnd = r.periodEnd;
      periodLabel = r.periodLabel;
    } else if (input.periodKey) {
      const period = this.periodResolver.resolveQuarter(input.periodKey);
      periodStart = period.start;
      periodEnd = period.end;
      periodLabel = period.label;

      const reports = await this.reportRepo.listByPeriodRange(
        workspaceId,
        "VAT_ADVANCE",
        period.start,
        new Date(period.end.getTime() + 1000)
      );
      report = reports.find(
        (r) =>
          r.periodStart.getTime() === period.start.getTime() &&
          r.periodEnd.getTime() === period.end.getTime()
      );

      if (!report) {
        throw new NotFoundException("Tax report not found for this period");
      }
    } else {
      throw new Error("Either periodKey or reportId must be provided");
    }

    // 2. Check if we already have a key
    if (report.pdfStorageKey) {
      const url = await this.objectStorage.createSignedDownloadUrl({
        tenantId: workspaceId,
        objectKey: report.pdfStorageKey,
        expiresInSeconds: 300,
      });
      return ok({ downloadUrl: url.url });
    }

    // 3. Generate PDF
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

    // 4. Upload
    const filenameKey = input.periodKey ?? periodLabel.replace(/\s/g, "-");
    const objectKey = `workspaces/${workspaceId}/tax-reports/${filenameKey}.pdf`;
    await this.objectStorage.putObject({
      tenantId: workspaceId,
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
      tenantId: workspaceId,
      objectKey,
      expiresInSeconds: 300,
    });
    return ok({ downloadUrl: url.url });
  }

  private formatCurrency(cents: number): string {
    return new Intl.NumberFormat("de-DE", { style: "currency", currency: "EUR" }).format(
      cents / 100
    );
  }
}
