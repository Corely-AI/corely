import type { TaxReportEntity } from "../entities";

export abstract class TaxReportRepoPort {
  abstract listByStatus(
    tenantId: string,
    status: "upcoming" | "submitted"
  ): Promise<TaxReportEntity[]>;

  abstract markSubmitted(tenantId: string, id: string, submittedAt: Date): Promise<TaxReportEntity>;

  abstract seedDefaultReports(tenantId: string): Promise<void>;
}
