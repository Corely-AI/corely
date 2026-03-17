import { Injectable } from "@nestjs/common";
import { PrismaService } from "@corely/data";
import type {
  TaxEricArtifactRef,
  TaxEricJobAction,
  TaxEricJobStatus,
  TaxEricReportType,
  TaxElsterDeclarationType,
  TaxElsterGatewayMessage,
  TaxElsterGatewayOutcome,
} from "@corely/contracts";
import { TaxEricJobRepoPort } from "../../domain/ports/tax-eric-job-repo.port";
import type { TaxEricJobEntity } from "../../domain/entities/tax-eric-job.entity";

const parseArtifacts = (value: unknown): TaxEricArtifactRef[] => {
  if (!Array.isArray(value)) {
    return [];
  }

  const parsed: TaxEricArtifactRef[] = [];
  for (const item of value) {
    if (!item || typeof item !== "object") {
      continue;
    }

    const candidate = item as Record<string, unknown>;
    const kind = candidate.kind;
    const documentId = candidate.documentId;
    if (
      (kind !== "xml" && kind !== "protocol_pdf" && kind !== "log") ||
      typeof documentId !== "string"
    ) {
      continue;
    }

    parsed.push({
      kind,
      documentId,
      fileName: typeof candidate.fileName === "string" ? candidate.fileName : undefined,
    });
  }

  return parsed;
};

const parseMessages = (value: unknown): TaxElsterGatewayMessage[] => {
  if (!Array.isArray(value)) {
    return [];
  }

  const parsed: TaxElsterGatewayMessage[] = [];
  for (const item of value) {
    if (!item || typeof item !== "object") {
      continue;
    }

    const candidate = item as Record<string, unknown>;
    const severity = candidate.severity;
    const code = candidate.code;
    const text = candidate.text;
    if (
      (severity !== "info" && severity !== "warning" && severity !== "error") ||
      typeof code !== "string" ||
      typeof text !== "string"
    ) {
      continue;
    }

    parsed.push({
      severity,
      code,
      text,
      path: typeof candidate.path === "string" ? candidate.path : undefined,
      ruleId: typeof candidate.ruleId === "string" ? candidate.ruleId : undefined,
    });
  }

  return parsed;
};

const parseResultCodes = (value: unknown): string[] => {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter((item): item is string => typeof item === "string");
};

const parseRecord = (value: unknown): Record<string, unknown> | null => {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }
  return value as Record<string, unknown>;
};

@Injectable()
export class PrismaTaxEricJobRepoAdapter extends TaxEricJobRepoPort {
  constructor(private readonly prisma: PrismaService) {
    super();
  }

  async create(params: {
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
  }): Promise<TaxEricJobEntity> {
    const row = await this.prisma.taxEricJob.create({
      data: {
        id: params.jobId,
        tenantId: params.tenantId,
        filingId: params.filingId,
        reportId: params.reportId,
        reportType: params.reportType,
        declarationType: params.declarationType ?? null,
        action: this.toDbAction(params.action),
        status: "QUEUED",
        correlationId: params.correlationId,
        idempotencyKey: params.idempotencyKey,
        payloadVersion: params.payloadVersion,
        requestHash: params.requestHash,
        certificateReferenceId: params.certificateReferenceId ?? null,
        requestPayload: params.requestPayload as object,
        resultCodes: [],
        messages: [],
        artifacts: [],
      },
    });

    return this.toEntity(row);
  }

  async findById(params: { tenantId: string; jobId: string }): Promise<TaxEricJobEntity | null> {
    const row = await this.prisma.taxEricJob.findFirst({
      where: { id: params.jobId, tenantId: params.tenantId },
    });
    return row ? this.toEntity(row) : null;
  }

  async listByReport(params: { tenantId: string; reportId: string }): Promise<TaxEricJobEntity[]> {
    const rows = await this.prisma.taxEricJob.findMany({
      where: {
        tenantId: params.tenantId,
        reportId: params.reportId,
      },
      orderBy: { createdAt: "desc" },
    });
    return rows.map((row) => this.toEntity(row));
  }

  async findLatestByIdempotencyKey(params: {
    tenantId: string;
    reportId: string;
    action: TaxEricJobAction;
    idempotencyKey: string;
  }): Promise<TaxEricJobEntity | null> {
    const row = await this.prisma.taxEricJob.findFirst({
      where: {
        tenantId: params.tenantId,
        reportId: params.reportId,
        action: this.toDbAction(params.action),
        idempotencyKey: params.idempotencyKey,
      },
      orderBy: { createdAt: "desc" },
    });

    return row ? this.toEntity(row) : null;
  }

  async markRunning(params: { tenantId: string; jobId: string; startedAt: Date }): Promise<void> {
    await this.prisma.taxEricJob.updateMany({
      where: {
        id: params.jobId,
        tenantId: params.tenantId,
      },
      data: {
        status: "RUNNING",
        startedAt: params.startedAt,
        updatedAt: new Date(),
      },
    });
  }

  async markCompleted(params: {
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
  }): Promise<void> {
    await this.prisma.taxEricJob.updateMany({
      where: {
        id: params.jobId,
        tenantId: params.tenantId,
      },
      data: {
        status: this.toDbStatus(params.status),
        finishedAt: params.finishedAt,
        artifacts: params.artifacts as object[],
        outcome: params.outcome,
        gatewayVersion: params.gatewayVersion ?? null,
        ericVersion: params.ericVersion ?? null,
        transferReference: params.transferReference ?? null,
        resultCodes: params.resultCodes,
        messages: params.messages as object[],
        responsePayload: params.responsePayload as object,
        technicalDetails: params.technicalDetails as object | null | undefined,
        errorMessage: null,
        updatedAt: new Date(),
      },
    });
  }

  async markFailed(params: {
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
  }): Promise<void> {
    await this.prisma.taxEricJob.updateMany({
      where: {
        id: params.jobId,
        tenantId: params.tenantId,
      },
      data: {
        status: this.toDbStatus(params.status),
        finishedAt: params.finishedAt,
        outcome: params.outcome ?? null,
        gatewayVersion: params.gatewayVersion ?? null,
        ericVersion: params.ericVersion ?? null,
        transferReference: params.transferReference ?? null,
        resultCodes: params.resultCodes ?? [],
        messages: (params.messages ?? []) as object[],
        errorMessage: params.errorMessage,
        responsePayload: params.responsePayload as object | undefined,
        technicalDetails: params.technicalDetails as object | null | undefined,
        updatedAt: new Date(),
      },
    });
  }

  private toDbAction(action: TaxEricJobAction): "VALIDATE" | "SUBMIT" {
    return action === "submit" ? "SUBMIT" : "VALIDATE";
  }

  private toDbStatus(
    status: TaxEricJobStatus
  ):
    | "QUEUED"
    | "RUNNING"
    | "VALIDATION_FAILED"
    | "SUBMISSION_FAILED"
    | "TECHNICAL_FAILED"
    | "SUCCEEDED"
    | "SUCCEEDED_WITH_WARNINGS" {
    switch (status) {
      case "running":
        return "RUNNING";
      case "validation_failed":
        return "VALIDATION_FAILED";
      case "submission_failed":
        return "SUBMISSION_FAILED";
      case "technical_failed":
        return "TECHNICAL_FAILED";
      case "succeeded":
        return "SUCCEEDED";
      case "succeeded_with_warnings":
        return "SUCCEEDED_WITH_WARNINGS";
      default:
        return "QUEUED";
    }
  }

  private toEntity(row: {
    id: string;
    tenantId: string;
    filingId: string;
    reportId: string;
    reportType: string;
    declarationType: string | null;
    action: "VALIDATE" | "SUBMIT";
    status:
      | "QUEUED"
      | "RUNNING"
      | "VALIDATION_FAILED"
      | "SUBMISSION_FAILED"
      | "TECHNICAL_FAILED"
      | "SUCCEEDED"
      | "SUCCEEDED_WITH_WARNINGS";
    correlationId: string | null;
    idempotencyKey: string | null;
    payloadVersion: string | null;
    requestHash: string | null;
    certificateReferenceId: string | null;
    gatewayVersion: string | null;
    ericVersion: string | null;
    transferReference: string | null;
    outcome: string | null;
    resultCodes: unknown;
    messages: unknown;
    requestPayload: unknown;
    responsePayload: unknown;
    technicalDetails: unknown;
    errorMessage: string | null;
    artifacts: unknown;
    createdAt: Date;
    startedAt: Date | null;
    finishedAt: Date | null;
    updatedAt: Date;
  }): TaxEricJobEntity {
    return {
      id: row.id,
      tenantId: row.tenantId,
      filingId: row.filingId,
      reportId: row.reportId,
      reportType: row.reportType as TaxEricReportType,
      declarationType: row.declarationType as TaxElsterDeclarationType | null,
      action: (row.action === "SUBMIT" ? "submit" : "validate") satisfies TaxEricJobAction,
      status: this.toContractStatus(row.status),
      correlationId: row.correlationId,
      idempotencyKey: row.idempotencyKey,
      payloadVersion: row.payloadVersion,
      requestHash: row.requestHash,
      certificateReferenceId: row.certificateReferenceId,
      gatewayVersion: row.gatewayVersion,
      ericVersion: row.ericVersion,
      transferReference: row.transferReference,
      outcome: (row.outcome as TaxElsterGatewayOutcome | null) ?? null,
      resultCodes: parseResultCodes(row.resultCodes),
      messages: parseMessages(row.messages),
      requestPayload: parseRecord(row.requestPayload),
      responsePayload: parseRecord(row.responsePayload),
      technicalDetails: parseRecord(row.technicalDetails),
      errorMessage: row.errorMessage,
      artifacts: parseArtifacts(row.artifacts),
      createdAt: row.createdAt,
      startedAt: row.startedAt,
      finishedAt: row.finishedAt,
      updatedAt: row.updatedAt,
    };
  }

  private toContractStatus(
    status:
      | "QUEUED"
      | "RUNNING"
      | "VALIDATION_FAILED"
      | "SUBMISSION_FAILED"
      | "TECHNICAL_FAILED"
      | "SUCCEEDED"
      | "SUCCEEDED_WITH_WARNINGS"
  ): TaxEricJobStatus {
    switch (status) {
      case "RUNNING":
        return "running";
      case "VALIDATION_FAILED":
        return "validation_failed";
      case "SUBMISSION_FAILED":
        return "submission_failed";
      case "TECHNICAL_FAILED":
        return "technical_failed";
      case "SUCCEEDED":
        return "succeeded";
      case "SUCCEEDED_WITH_WARNINGS":
        return "succeeded_with_warnings";
      default:
        return "queued";
    }
  }
}
