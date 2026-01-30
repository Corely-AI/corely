import type { TaxReportEntity } from "../entities";

export abstract class TaxReportRepoPort {
  abstract listByStatus(
    tenantId: string,
    status: "upcoming" | "submitted"
  ): Promise<TaxReportEntity[]>;

  abstract findById(tenantId: string, id: string): Promise<TaxReportEntity | null>;

  abstract markSubmitted(tenantId: string, id: string, submittedAt: Date): Promise<TaxReportEntity>;
  abstract submitReport(params: {
    tenantId: string;
    reportId: string;
    submittedAt: Date;
    submissionReference: string;
    submissionNotes?: string | null;
  }): Promise<TaxReportEntity>;

  abstract markPaid(params: {
    tenantId: string;
    reportId: string;
    paidAt: Date;
    amountCents: number;
    method: string;
    proofDocumentId?: string | null;
  }): Promise<TaxReportEntity>;

  abstract updateMeta(params: {
    tenantId: string;
    reportId: string;
    meta: Record<string, unknown>;
  }): Promise<TaxReportEntity>;

  abstract delete(tenantId: string, id: string): Promise<void>;

  abstract listByPeriodRange(
    tenantId: string,
    type: string,
    start: Date,
    end: Date
  ): Promise<TaxReportEntity[]>;

  abstract upsertByPeriod(input: {
    tenantId: string;
    type: string;
    group: string;
    periodLabel: string;
    periodStart: Date;
    periodEnd: Date;
    dueDate: Date;
    status: string;
    amountFinalCents?: number | null;
    submissionReference?: string | null;
    submissionNotes?: string | null;
    archivedReason?: string | null;
    submittedAt?: Date | null;
    pdfStorageKey?: string | null;
  }): Promise<TaxReportEntity>;

  abstract seedDefaultReports(tenantId: string): Promise<void>;
}
