import type {
  TaxEricArtifactRef,
  TaxEricJobAction,
  TaxEricReportType,
  TaxEricJobStatus,
  TaxElsterDeclarationType,
  TaxElsterGatewayMessage,
  TaxElsterGatewayOutcome,
} from "@corely/contracts";

export interface TaxEricJobEntity {
  id: string;
  tenantId: string;
  filingId: string;
  reportId: string;
  reportType: TaxEricReportType;
  declarationType?: TaxElsterDeclarationType | null;
  action: TaxEricJobAction;
  status: TaxEricJobStatus;
  correlationId?: string | null;
  idempotencyKey?: string | null;
  payloadVersion?: string | null;
  requestHash?: string | null;
  certificateReferenceId?: string | null;
  gatewayVersion?: string | null;
  ericVersion?: string | null;
  transferReference?: string | null;
  outcome?: TaxElsterGatewayOutcome | null;
  resultCodes: string[];
  messages: TaxElsterGatewayMessage[];
  requestPayload?: Record<string, unknown> | null;
  responsePayload?: Record<string, unknown> | null;
  technicalDetails?: Record<string, unknown> | null;
  errorMessage?: string | null;
  artifacts: TaxEricArtifactRef[];
  createdAt: Date;
  startedAt?: Date | null;
  finishedAt?: Date | null;
  updatedAt: Date;
}
