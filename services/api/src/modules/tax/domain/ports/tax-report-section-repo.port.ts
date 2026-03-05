import type { TaxFilingReportType, TaxReportSectionKey } from "@corely/contracts";
import type {
  TaxReportSectionEntity,
  TaxReportSectionValidationErrorEntity,
} from "../entities/tax-report-section.entity";

export abstract class TaxReportSectionRepoPort {
  abstract findByReportAndSection(params: {
    tenantId: string;
    reportId: string;
    sectionKey: TaxReportSectionKey;
  }): Promise<TaxReportSectionEntity | null>;

  abstract listByReport(params: {
    tenantId: string;
    reportId: string;
  }): Promise<TaxReportSectionEntity[]>;

  abstract upsert(params: {
    tenantId: string;
    filingId: string;
    reportId: string;
    reportType: TaxFilingReportType;
    sectionKey: TaxReportSectionKey;
    payload: Record<string, unknown>;
    completion: number;
    isComplete: boolean;
    validationErrors: TaxReportSectionValidationErrorEntity[];
  }): Promise<TaxReportSectionEntity>;
}
