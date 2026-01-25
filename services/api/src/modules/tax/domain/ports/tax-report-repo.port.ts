import type { TaxReportEntity } from "../entities";

export abstract class TaxReportRepoPort {
  abstract listByStatus(
    tenantId: string,
    status: "upcoming" | "submitted"
  ): Promise<TaxReportEntity[]>;

  abstract markSubmitted(tenantId: string, id: string, submittedAt: Date): Promise<TaxReportEntity>;

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
  }): Promise<TaxReportEntity>;

  abstract seedDefaultReports(tenantId: string): Promise<void>;
}
