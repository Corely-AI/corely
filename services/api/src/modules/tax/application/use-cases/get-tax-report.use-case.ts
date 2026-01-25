import { Injectable } from "@nestjs/common";
import { TaxReportRepoPort } from "../../domain/ports/tax-report-repo.port";
import { TaxReportDto } from "@corely/contracts";

@Injectable()
export class GetTaxReportUseCase {
  constructor(private readonly repo: TaxReportRepoPort) {}

  async execute(tenantId: string, id: string): Promise<TaxReportDto | null> {
    const entity = await this.repo.findById(tenantId, id);
    if (!entity) {return null;}

    return {
      id: entity.id,
      tenantId: entity.tenantId,
      type: entity.type,
      group: entity.group,
      periodLabel: entity.periodLabel,
      periodStart: entity.periodStart.toISOString(),
      periodEnd: entity.periodEnd.toISOString(),
      dueDate: entity.dueDate.toISOString(),
      status: entity.status,
      amountEstimatedCents: entity.amountEstimatedCents,
      amountFinalCents: entity.amountFinalCents,
      currency: entity.currency,
      submittedAt: entity.submittedAt?.toISOString(),
      submissionReference: entity.submissionReference,
      submissionNotes: entity.submissionNotes,
      archivedReason: entity.archivedReason,
      pdfStorageKey: entity.pdfStorageKey,
      pdfGeneratedAt: entity.pdfGeneratedAt?.toISOString(),
      meta: entity.meta,
      lines: entity.lines?.map((l) => ({
        section: l.section,
        label: l.label,
        netAmountCents: l.netAmountCents,
        taxAmountCents: l.taxAmountCents,
        meta: l.meta,
      })),
      createdAt: entity.createdAt.toISOString(),
      updatedAt: entity.updatedAt.toISOString(),
    };
  }
}
