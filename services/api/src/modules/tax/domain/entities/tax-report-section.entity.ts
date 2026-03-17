import type { TaxFilingReportType, TaxReportSectionKey } from "@corely/contracts";

export type TaxReportSectionValidationErrorEntity = {
  path: string;
  message: string;
  code?: string;
};

export interface TaxReportSectionEntity {
  id: string;
  tenantId: string;
  filingId: string;
  reportId: string;
  reportType: TaxFilingReportType;
  sectionKey: TaxReportSectionKey;
  payload: Record<string, unknown>;
  completion: number;
  isComplete: boolean;
  validationErrors: TaxReportSectionValidationErrorEntity[];
  createdAt: Date;
  updatedAt: Date;
}
