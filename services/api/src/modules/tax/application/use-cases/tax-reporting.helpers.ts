import {
  type TaxEricJob,
  type TaxReportSection,
  type TaxReportSectionValidationError,
  type AnnualIncomeSectionPayload,
} from "@corely/contracts";
import { NotFoundError, ValidationError } from "@corely/kernel";
import type {
  TaxEricJobEntity,
  TaxReportEntity,
  TaxReportSectionEntity,
} from "../../domain/entities";
import type { TaxReportRepoPort } from "../../domain/ports";

export const ensureIncomeTaxReportForFiling = async (params: {
  reportRepo: TaxReportRepoPort;
  workspaceId: string;
  filingId: string;
  reportId: string;
}): Promise<TaxReportEntity> => {
  const filing = await params.reportRepo.findById(params.workspaceId, params.filingId);
  if (!filing) {
    throw new NotFoundError("Filing not found", { filingId: params.filingId });
  }

  const report =
    params.reportId === params.filingId
      ? filing
      : await params.reportRepo.findById(params.workspaceId, params.reportId);

  if (!report) {
    throw new NotFoundError("Report not found", { reportId: params.reportId });
  }

  if (report.type !== "INCOME_TAX") {
    throw new ValidationError(
      "Annual income report is supported only for INCOME_TAX filings.",
      undefined,
      "Tax:UnsupportedReportType"
    );
  }

  return report;
};

export const ensureUstvaReportForFiling = async (params: {
  reportRepo: TaxReportRepoPort;
  workspaceId: string;
  filingId: string;
  reportId: string;
}): Promise<TaxReportEntity> => {
  if (params.reportId !== params.filingId) {
    throw new ValidationError(
      "ELSTER UStVA jobs currently operate on the filing report itself.",
      undefined,
      "Tax:UnsupportedReportType"
    );
  }

  const report = await params.reportRepo.findById(params.workspaceId, params.filingId);
  if (!report) {
    throw new NotFoundError("Filing not found", { filingId: params.filingId });
  }

  if (report.type !== "VAT_ADVANCE") {
    throw new ValidationError(
      "ELSTER submission is currently supported only for DE periodic VAT filings (UStVA).",
      undefined,
      "Tax:UnsupportedReportType"
    );
  }

  return report;
};

export const toAnnualIncomeSectionDto = (params: {
  section: Pick<
    TaxReportSectionEntity,
    | "id"
    | "filingId"
    | "reportId"
    | "reportType"
    | "sectionKey"
    | "completion"
    | "isComplete"
    | "validationErrors"
    | "createdAt"
    | "updatedAt"
  >;
  annualIncome: AnnualIncomeSectionPayload;
  validationErrors?: TaxReportSectionValidationError[];
}): TaxReportSection => ({
  id: params.section.id,
  filingId: params.section.filingId,
  reportId: params.section.reportId,
  reportType: params.section.reportType,
  sectionKey: params.section.sectionKey,
  completion: params.section.completion,
  isComplete: params.section.isComplete,
  validationErrors: params.validationErrors ?? params.section.validationErrors,
  payload: {
    annualIncome: params.annualIncome,
  },
  createdAt: params.section.createdAt.toISOString(),
  updatedAt: params.section.updatedAt.toISOString(),
});

export const toTaxEricJobDto = (job: TaxEricJobEntity): TaxEricJob => ({
  id: job.id,
  filingId: job.filingId,
  reportId: job.reportId,
  reportType: job.reportType,
  declarationType: job.declarationType ?? null,
  action: job.action,
  status: job.status,
  correlationId: job.correlationId ?? null,
  idempotencyKey: job.idempotencyKey ?? null,
  payloadVersion: job.payloadVersion ?? null,
  requestHash: job.requestHash ?? null,
  certificateReferenceId: job.certificateReferenceId ?? null,
  gatewayVersion: job.gatewayVersion ?? null,
  ericVersion: job.ericVersion ?? null,
  transferReference: job.transferReference ?? null,
  outcome: job.outcome ?? null,
  resultCodes: job.resultCodes,
  messages: job.messages,
  requestPayload: job.requestPayload ?? null,
  responsePayload: job.responsePayload ?? null,
  technicalDetails: job.technicalDetails ?? null,
  errorMessage: job.errorMessage ?? null,
  artifacts: job.artifacts,
  createdAt: job.createdAt.toISOString(),
  startedAt: job.startedAt?.toISOString() ?? null,
  finishedAt: job.finishedAt?.toISOString() ?? null,
  updatedAt: job.updatedAt.toISOString(),
});
