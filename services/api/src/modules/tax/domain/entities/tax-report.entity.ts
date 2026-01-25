import type { TaxReportGroup, TaxReportType, TaxReportStatus } from "@corely/contracts";

export interface TaxReportEntity {
  id: string;
  tenantId: string;
  type: TaxReportType;
  group: TaxReportGroup;
  periodLabel: string;
  periodStart: Date;
  periodEnd: Date;
  dueDate: Date;
  status: TaxReportStatus;
  amountEstimatedCents: number | null;
  amountFinalCents?: number | null;
  currency: string;
  submittedAt?: Date | null;
  submissionReference?: string | null;
  submissionNotes?: string | null;
  archivedReason?: string | null;
  pdfStorageKey?: string | null;
  pdfGeneratedAt?: Date | null;
  meta?: Record<string, any> | null;
  lines?: {
    section?: string | null;
    label?: string | null;
    netAmountCents: number;
    taxAmountCents?: number | null;
    meta?: Record<string, any> | null;
  }[];
  createdAt: Date;
  updatedAt: Date;
}
