import type {
  TaxEricArtifactRef,
  TaxEricJobAction,
  TaxEricJobStatus,
  TaxFilingReportType,
} from "@corely/contracts";

export interface TaxEricJobEntity {
  id: string;
  tenantId: string;
  filingId: string;
  reportId: string;
  reportType: TaxFilingReportType;
  action: TaxEricJobAction;
  status: TaxEricJobStatus;
  requestPayload?: Record<string, unknown> | null;
  responsePayload?: Record<string, unknown> | null;
  errorMessage?: string | null;
  artifacts: TaxEricArtifactRef[];
  createdAt: Date;
  startedAt?: Date | null;
  finishedAt?: Date | null;
  updatedAt: Date;
}
