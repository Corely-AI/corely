import type {
  TaxEricArtifactRef,
  TaxEricJobAction,
  TaxEricJobStatus,
  TaxEricReportType,
  TaxElsterDeclarationType,
  TaxElsterGatewayMessage,
  TaxElsterGatewayOutcome,
} from "@corely/contracts";
import type { TaxEricJobEntity } from "../entities/tax-eric-job.entity";

export abstract class TaxEricJobRepoPort {
  abstract create(params: {
    jobId: string;
    tenantId: string;
    filingId: string;
    reportId: string;
    reportType: TaxEricReportType;
    declarationType?: TaxElsterDeclarationType | null;
    action: TaxEricJobAction;
    requestPayload: Record<string, unknown>;
    correlationId?: string;
    idempotencyKey?: string;
    payloadVersion?: string;
    requestHash?: string;
    certificateReferenceId?: string | null;
  }): Promise<TaxEricJobEntity>;

  abstract findById(params: { tenantId: string; jobId: string }): Promise<TaxEricJobEntity | null>;

  abstract listByReport(params: {
    tenantId: string;
    reportId: string;
  }): Promise<TaxEricJobEntity[]>;

  abstract findLatestByIdempotencyKey(params: {
    tenantId: string;
    reportId: string;
    action: TaxEricJobAction;
    idempotencyKey: string;
  }): Promise<TaxEricJobEntity | null>;

  abstract markRunning(params: { tenantId: string; jobId: string; startedAt: Date }): Promise<void>;

  abstract markCompleted(params: {
    tenantId: string;
    jobId: string;
    status: Extract<TaxEricJobStatus, "succeeded" | "succeeded_with_warnings">;
    finishedAt: Date;
    artifacts: TaxEricArtifactRef[];
    outcome: TaxElsterGatewayOutcome;
    gatewayVersion?: string | null;
    ericVersion?: string | null;
    transferReference?: string | null;
    resultCodes: string[];
    messages: TaxElsterGatewayMessage[];
    responsePayload: Record<string, unknown>;
    technicalDetails?: Record<string, unknown> | null;
  }): Promise<void>;

  abstract markFailed(params: {
    tenantId: string;
    jobId: string;
    status: Extract<
      TaxEricJobStatus,
      "validation_failed" | "submission_failed" | "technical_failed"
    >;
    finishedAt: Date;
    outcome?: TaxElsterGatewayOutcome | null;
    errorMessage: string;
    gatewayVersion?: string | null;
    ericVersion?: string | null;
    transferReference?: string | null;
    resultCodes?: string[];
    messages?: TaxElsterGatewayMessage[];
    responsePayload?: Record<string, unknown>;
    technicalDetails?: Record<string, unknown> | null;
  }): Promise<void>;
}
