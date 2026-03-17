import type {
  TaxElsterGatewayOperation,
  TaxElsterGatewayRequest,
  TaxFilingDetail,
  TaxEricReportType,
} from "@corely/contracts";
import type { TaxReportEntity } from "../../domain/entities";

export const TAX_ELSTER_SUBMISSION_BUILDER_PORT = Symbol("TAX_ELSTER_SUBMISSION_BUILDER_PORT");

export type TaxElsterSubmissionBuilderInput = {
  requestId: string;
  filing: TaxFilingDetail;
  report: TaxReportEntity;
  reportType: TaxEricReportType;
  operation: TaxElsterGatewayOperation;
  tenantId: string;
  workspaceId: string;
  correlationId: string;
  actorUserId?: string;
  idempotencyKey?: string;
};

export abstract class TaxElsterSubmissionBuilderPort {
  abstract build(input: TaxElsterSubmissionBuilderInput): TaxElsterGatewayRequest;
}
