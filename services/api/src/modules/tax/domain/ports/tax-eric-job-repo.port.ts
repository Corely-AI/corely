import type { TaxEricArtifactRef, TaxEricJobAction, TaxFilingReportType } from "@corely/contracts";
import type { TaxEricJobEntity } from "../entities/tax-eric-job.entity";

export abstract class TaxEricJobRepoPort {
  abstract create(params: {
    tenantId: string;
    filingId: string;
    reportId: string;
    reportType: TaxFilingReportType;
    action: TaxEricJobAction;
    requestPayload: Record<string, unknown>;
  }): Promise<TaxEricJobEntity>;

  abstract findById(params: { tenantId: string; jobId: string }): Promise<TaxEricJobEntity | null>;

  abstract listByReport(params: {
    tenantId: string;
    reportId: string;
  }): Promise<TaxEricJobEntity[]>;

  abstract markRunning(params: { tenantId: string; jobId: string; startedAt: Date }): Promise<void>;

  abstract markSucceeded(params: {
    tenantId: string;
    jobId: string;
    finishedAt: Date;
    artifacts: TaxEricArtifactRef[];
    responsePayload: Record<string, unknown>;
  }): Promise<void>;

  abstract markFailed(params: {
    tenantId: string;
    jobId: string;
    finishedAt: Date;
    errorMessage: string;
    responsePayload?: Record<string, unknown>;
  }): Promise<void>;
}
