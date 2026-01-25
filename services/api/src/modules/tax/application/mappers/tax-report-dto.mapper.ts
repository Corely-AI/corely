import type { TaxReportDto } from "@corely/contracts";
import type { TaxReportEntity } from "../../domain/entities";

export const mapTaxReportToDto = (entity: TaxReportEntity): TaxReportDto => ({
  id: entity.id,
  tenantId: entity.tenantId,
  type: entity.type,
  group: entity.group,
  periodLabel: entity.periodLabel,
  periodStart: entity.periodStart.toISOString(),
  periodEnd: entity.periodEnd.toISOString(),
  dueDate: entity.dueDate.toISOString(),
  status: entity.status,
  amountEstimatedCents: entity.amountEstimatedCents ?? null,
  amountFinalCents: entity.amountFinalCents ?? null,
  currency: entity.currency,
  submittedAt: entity.submittedAt?.toISOString() ?? null,
  submissionReference: entity.submissionReference ?? null,
  submissionNotes: entity.submissionNotes ?? null,
  archivedReason: entity.archivedReason ?? null,
  pdfStorageKey: entity.pdfStorageKey ?? null,
  pdfGeneratedAt: entity.pdfGeneratedAt?.toISOString() ?? null,
  createdAt: entity.createdAt.toISOString(),
  updatedAt: entity.updatedAt.toISOString(),
});
