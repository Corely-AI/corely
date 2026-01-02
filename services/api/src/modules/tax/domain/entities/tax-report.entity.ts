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
  createdAt: Date;
  updatedAt: Date;
}
