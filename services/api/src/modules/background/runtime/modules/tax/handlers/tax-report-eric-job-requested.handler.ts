import { Logger } from "@nestjs/common";
import { randomUUID } from "node:crypto";
import { DocumentAggregate } from "@corely/domain";
import {
  ExternalServiceError,
  type AuditPort,
  type ObjectStoragePort,
  type OutboxPort,
} from "@corely/kernel";
import { TaxElsterGatewayRequestSchema, type TaxElsterGatewayResult } from "@corely/contracts";
import { type PrismaDocumentRepoAdapter, type PrismaFileRepoAdapter } from "@corely/data";
import type { EventHandler, OutboxEvent } from "../../outbox/event-handler.interface";
import { type PrismaTaxReportRepoAdapter } from "@/modules/tax/infrastructure/prisma/prisma-tax-report-repo.adapter";
import { type PrismaTaxEricJobRepoAdapter } from "@/modules/tax/infrastructure/prisma/prisma-tax-eric-job-repo.adapter";
import {
  isTerminalTaxEricJobStatus,
  mapGatewayOutcomeToTaxEricJobStatus,
} from "@/modules/tax/domain/entities";
import { type TaxElsterGatewayPort } from "@/modules/tax/application/ports/tax-elster-gateway.port";

type Payload = {
  tenantId: string;
  workspaceId?: string | null;
  filingId: string;
  reportId: string;
  jobId: string;
};

export class TaxReportEricJobRequestedHandler implements EventHandler {
  readonly eventType = "tax.report.eric.job.requested";
  private readonly logger = new Logger(TaxReportEricJobRequestedHandler.name);

  constructor(
    private readonly ericJobRepo: PrismaTaxEricJobRepoAdapter,
    private readonly reportRepo: PrismaTaxReportRepoAdapter,
    private readonly gateway: TaxElsterGatewayPort,
    private readonly objectStorage: ObjectStoragePort,
    private readonly documentRepo: PrismaDocumentRepoAdapter,
    private readonly fileRepo: PrismaFileRepoAdapter,
    private readonly audit: AuditPort,
    private readonly outbox: OutboxPort
  ) {}

  async handle(event: OutboxEvent): Promise<void> {
    const payload = event.payload as Payload;
    const tenantId = payload?.tenantId ?? event.tenantId;
    const workspaceId = payload?.workspaceId ?? tenantId;
    if (!tenantId || !workspaceId || !payload?.jobId) {
      this.logger.error("tax_report_eric_job.invalid_payload", { payload });
      return;
    }

    const job = await this.ericJobRepo.findById({
      tenantId: workspaceId,
      jobId: payload.jobId,
    });
    if (!job) {
      this.logger.error("tax_report_eric_job.not_found", { jobId: payload.jobId, tenantId });
      return;
    }

    if (isTerminalTaxEricJobStatus(job.status)) {
      return;
    }

    const parsedRequest = TaxElsterGatewayRequestSchema.safeParse(job.requestPayload ?? {});
    if (!parsedRequest.success) {
      await this.ericJobRepo.markFailed({
        tenantId: workspaceId,
        jobId: job.id,
        status: "technical_failed",
        finishedAt: new Date(),
        outcome: "technical_failed",
        errorMessage: "Stored ELSTER gateway request payload is invalid.",
        technicalDetails: {
          issues: parsedRequest.error.issues,
        },
      });
      return;
    }

    await this.ericJobRepo.markRunning({
      tenantId: workspaceId,
      jobId: job.id,
      startedAt: new Date(),
    });

    await this.audit.log({
      tenantId: workspaceId,
      action: "tax_elster_job.started",
      entityType: "TAX_ERIC_JOB",
      entityId: job.id,
      userId: "system",
      metadata: {
        filingId: job.filingId,
        reportId: job.reportId,
        action: job.action,
        correlationId: parsedRequest.data.correlationId,
      },
    });

    try {
      const result = await this.gateway.execute(parsedRequest.data);
      await this.handleGatewayResult({
        workspaceId,
        jobId: job.id,
        filingId: job.filingId,
        reportId: job.reportId,
        certificateReferenceId: job.certificateReferenceId ?? null,
        result,
      });
    } catch (error) {
      const details =
        error instanceof ExternalServiceError && error.details && typeof error.details === "object"
          ? (error.details as Record<string, unknown>)
          : null;

      await this.ericJobRepo.markFailed({
        tenantId: workspaceId,
        jobId: job.id,
        status: "technical_failed",
        finishedAt: new Date(),
        outcome: "technical_failed",
        errorMessage: error instanceof Error ? error.message : "ELSTER gateway execution failed",
        technicalDetails: {
          ...(details ?? {}),
          gatewayConfigured: this.gateway.getConnectionStatus() === "connected",
        },
      });

      await this.audit.log({
        tenantId: workspaceId,
        action: "tax_elster_job.technical_failed",
        entityType: "TAX_ERIC_JOB",
        entityId: job.id,
        userId: "system",
        metadata: {
          filingId: job.filingId,
          reportId: job.reportId,
          action: job.action,
          errorMessage: error instanceof Error ? error.message : String(error),
          technicalDetails: details ?? undefined,
        },
      });
    }
  }

  private async handleGatewayResult(params: {
    workspaceId: string;
    jobId: string;
    filingId: string;
    reportId: string;
    certificateReferenceId?: string | null;
    result: TaxElsterGatewayResult;
  }): Promise<void> {
    const hasWarnings = params.result.messages.some((message) => message.severity === "warning");
    const status = mapGatewayOutcomeToTaxEricJobStatus({
      outcome: params.result.outcome,
      hasWarnings,
    });
    const artifacts = await this.persistArtifacts({
      workspaceId: params.workspaceId,
      jobId: params.jobId,
      reportId: params.reportId,
      result: params.result,
    });

    const responsePayload = {
      requestId: params.result.requestId,
      gatewayStatus: params.result.gatewayStatus,
      outcome: params.result.outcome,
      rawMetadata: params.result.rawMetadata,
    };

    if (status === "succeeded" || status === "succeeded_with_warnings") {
      if (params.result.operation === "submit") {
        if (!params.result.transferReference) {
          await this.ericJobRepo.markFailed({
            tenantId: params.workspaceId,
            jobId: params.jobId,
            status: "technical_failed",
            finishedAt: new Date(params.result.finishedAt),
            outcome: "technical_failed",
            errorMessage: "Gateway submit result did not include a transfer reference.",
            gatewayVersion: params.result.gatewayVersion ?? null,
            ericVersion: params.result.ericVersion ?? null,
            resultCodes: params.result.resultCodes,
            messages: params.result.messages,
            responsePayload,
            technicalDetails: {
              gatewayStatus: params.result.gatewayStatus,
            },
          });
          return;
        }

        await this.reportRepo.submitReport({
          tenantId: params.workspaceId,
          reportId: params.reportId,
          submittedAt: new Date(params.result.finishedAt),
          submissionReference: params.result.transferReference,
          submissionNotes: `ELSTER ${params.result.operation} completed via gateway`,
          submissionMethod: "elster",
          submissionMeta: {
            channel: "elster",
            evidence: {
              transferReference: params.result.transferReference,
              gatewayVersion: params.result.gatewayVersion,
              ericVersion: params.result.ericVersion,
              certificateReferenceId: params.certificateReferenceId,
            },
            resultCodes: params.result.resultCodes,
          },
        });

        await this.outbox.enqueue({
          tenantId: params.workspaceId,
          eventType: "TaxFilingSubmitted",
          payload: {
            filingId: params.filingId,
            tenantId: params.workspaceId,
            submittedAt: params.result.finishedAt,
            submissionId: params.result.transferReference,
            method: "elster",
          },
          correlationId: params.result.correlationId,
        });
      }

      await this.ericJobRepo.markCompleted({
        tenantId: params.workspaceId,
        jobId: params.jobId,
        status,
        finishedAt: new Date(params.result.finishedAt),
        artifacts,
        outcome: params.result.outcome,
        gatewayVersion: params.result.gatewayVersion ?? null,
        ericVersion: params.result.ericVersion ?? null,
        transferReference: params.result.transferReference ?? null,
        resultCodes: params.result.resultCodes,
        messages: params.result.messages,
        responsePayload,
      });

      await this.audit.log({
        tenantId: params.workspaceId,
        action:
          params.result.operation === "submit"
            ? "tax_elster_job.submission_succeeded"
            : "tax_elster_job.validation_succeeded",
        entityType: "TAX_ERIC_JOB",
        entityId: params.jobId,
        userId: "system",
        metadata: {
          filingId: params.filingId,
          gatewayVersion: params.result.gatewayVersion,
          ericVersion: params.result.ericVersion,
          transferReference: params.result.transferReference,
          warnings: params.result.messages.filter((message) => message.severity === "warning")
            .length,
        },
      });
      return;
    }

    const failureStatus =
      status === "validation_failed" ||
      status === "submission_failed" ||
      status === "technical_failed"
        ? status
        : "technical_failed";

    await this.ericJobRepo.markFailed({
      tenantId: params.workspaceId,
      jobId: params.jobId,
      status: failureStatus,
      finishedAt: new Date(params.result.finishedAt),
      outcome: params.result.outcome,
      errorMessage:
        params.result.messages.find((message) => message.severity === "error")?.text ??
        `ELSTER ${params.result.operation} failed`,
      gatewayVersion: params.result.gatewayVersion ?? null,
      ericVersion: params.result.ericVersion ?? null,
      transferReference: params.result.transferReference ?? null,
      resultCodes: params.result.resultCodes,
      messages: params.result.messages,
      responsePayload,
      technicalDetails:
        params.result.outcome === "technical_failed"
          ? {
              gatewayStatus: params.result.gatewayStatus,
            }
          : null,
    });

    await this.audit.log({
      tenantId: params.workspaceId,
      action: `tax_elster_job.${failureStatus}`,
      entityType: "TAX_ERIC_JOB",
      entityId: params.jobId,
      userId: "system",
      metadata: {
        filingId: params.filingId,
        resultCodes: params.result.resultCodes,
        transferReference: params.result.transferReference,
        gatewayStatus: params.result.gatewayStatus,
      },
    });
  }

  private async persistArtifacts(params: {
    workspaceId: string;
    jobId: string;
    reportId: string;
    result: TaxElsterGatewayResult;
  }) {
    const artifacts = [];

    for (const artifact of params.result.artifacts) {
      const textEncoding = artifact.encoding === "base64" ? "base64" : "utf8";
      const bytes =
        typeof artifact.contentBase64 === "string"
          ? Buffer.from(artifact.contentBase64, "base64")
          : Buffer.from(artifact.textContent ?? "", textEncoding);
      const extension = this.resolveExtension(artifact.kind, artifact.fileName);
      const fileName = artifact.fileName ?? `${artifact.kind}-${params.jobId}.${extension}`;
      const objectKey = `workspaces/${params.workspaceId}/tax-reports/${params.reportId}/elster/${params.jobId}/${fileName}`;
      const upload = await this.objectStorage.putObject({
        tenantId: params.workspaceId,
        objectKey,
        contentType: artifact.contentType,
        bytes,
      });

      const now = new Date();
      const document = DocumentAggregate.create({
        id: randomUUID(),
        tenantId: params.workspaceId,
        type: "OTHER",
        title: fileName,
        status: "READY",
        createdAt: now,
        file: {
          id: randomUUID(),
          kind: "GENERATED",
          storageProvider: this.objectStorage.provider(),
          bucket: this.objectStorage.bucket(),
          objectKey,
          contentType: artifact.contentType,
          sizeBytes: upload.sizeBytes,
          createdAt: now,
        },
      });

      await this.documentRepo.create(document);
      const file = document.files[0];
      if (file) {
        await this.fileRepo.create(file);
      }

      artifacts.push({
        kind: artifact.kind,
        documentId: document.id,
        fileName,
      });
    }

    return artifacts;
  }

  private resolveExtension(kind: "xml" | "protocol_pdf" | "log", fileName?: string): string {
    if (fileName && fileName.includes(".")) {
      return fileName.split(".").pop() ?? "dat";
    }

    switch (kind) {
      case "protocol_pdf":
        return "pdf";
      case "log":
        return "log";
      default:
        return "xml";
    }
  }
}
