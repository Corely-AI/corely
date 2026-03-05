import { Injectable } from "@nestjs/common";
import { PrismaService } from "@corely/data";
import type {
  TaxEricArtifactRef,
  TaxEricJobAction,
  TaxEricJobStatus,
  TaxFilingReportType,
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

    const kind = "kind" in item ? item.kind : undefined;
    const documentId = "documentId" in item ? item.documentId : undefined;
    const fileName = "fileName" in item ? item.fileName : undefined;
    if (
      (kind !== "xml" && kind !== "protocol_pdf" && kind !== "log") ||
      typeof documentId !== "string"
    ) {
      continue;
    }

    parsed.push({
      kind,
      documentId,
      fileName: typeof fileName === "string" ? fileName : undefined,
    });
  }

  return parsed;
};

@Injectable()
export class PrismaTaxEricJobRepoAdapter extends TaxEricJobRepoPort {
  constructor(private readonly prisma: PrismaService) {
    super();
  }

  async create(params: {
    tenantId: string;
    filingId: string;
    reportId: string;
    reportType: TaxFilingReportType;
    action: TaxEricJobAction;
    requestPayload: Record<string, unknown>;
  }): Promise<TaxEricJobEntity> {
    const row = await this.prisma.taxEricJob.create({
      data: {
        tenantId: params.tenantId,
        filingId: params.filingId,
        reportId: params.reportId,
        reportType: params.reportType,
        action: this.toDbAction(params.action),
        status: "QUEUED",
        requestPayload: params.requestPayload as object,
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

  async markSucceeded(params: {
    tenantId: string;
    jobId: string;
    finishedAt: Date;
    artifacts: TaxEricArtifactRef[];
    responsePayload: Record<string, unknown>;
  }): Promise<void> {
    await this.prisma.taxEricJob.updateMany({
      where: {
        id: params.jobId,
        tenantId: params.tenantId,
      },
      data: {
        status: "SUCCEEDED",
        finishedAt: params.finishedAt,
        artifacts: params.artifacts as object[],
        responsePayload: params.responsePayload as object,
        errorMessage: null,
        updatedAt: new Date(),
      },
    });
  }

  async markFailed(params: {
    tenantId: string;
    jobId: string;
    finishedAt: Date;
    errorMessage: string;
    responsePayload?: Record<string, unknown>;
  }): Promise<void> {
    await this.prisma.taxEricJob.updateMany({
      where: {
        id: params.jobId,
        tenantId: params.tenantId,
      },
      data: {
        status: "FAILED",
        finishedAt: params.finishedAt,
        errorMessage: params.errorMessage,
        responsePayload: params.responsePayload ? (params.responsePayload as object) : undefined,
        updatedAt: new Date(),
      },
    });
  }

  private toDbAction(action: TaxEricJobAction): "VALIDATE" | "SUBMIT" {
    return action === "submit" ? "SUBMIT" : "VALIDATE";
  }

  private toEntity(row: {
    id: string;
    tenantId: string;
    filingId: string;
    reportId: string;
    reportType: string;
    action: "VALIDATE" | "SUBMIT";
    status: "QUEUED" | "RUNNING" | "SUCCEEDED" | "FAILED";
    requestPayload: unknown;
    responsePayload: unknown;
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
      reportType: row.reportType as TaxFilingReportType,
      action: (row.action === "SUBMIT" ? "submit" : "validate") satisfies TaxEricJobAction,
      status: this.toContractStatus(row.status),
      requestPayload:
        row.requestPayload &&
        typeof row.requestPayload === "object" &&
        !Array.isArray(row.requestPayload)
          ? (row.requestPayload as Record<string, unknown>)
          : null,
      responsePayload:
        row.responsePayload &&
        typeof row.responsePayload === "object" &&
        !Array.isArray(row.responsePayload)
          ? (row.responsePayload as Record<string, unknown>)
          : null,
      errorMessage: row.errorMessage,
      artifacts: parseArtifacts(row.artifacts),
      createdAt: row.createdAt,
      startedAt: row.startedAt,
      finishedAt: row.finishedAt,
      updatedAt: row.updatedAt,
    };
  }

  private toContractStatus(
    status: "QUEUED" | "RUNNING" | "SUCCEEDED" | "FAILED"
  ): TaxEricJobStatus {
    switch (status) {
      case "RUNNING":
        return "running";
      case "SUCCEEDED":
        return "succeeded";
      case "FAILED":
        return "failed";
      default:
        return "queued";
    }
  }
}
