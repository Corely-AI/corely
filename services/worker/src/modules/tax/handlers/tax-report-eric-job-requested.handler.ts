import { Logger } from "@nestjs/common";
import { randomUUID } from "node:crypto";
import { DocumentAggregate } from "@corely/domain";
import type { ObjectStoragePort } from "@corely/kernel";
import { type PrismaDocumentRepoAdapter, type PrismaFileRepoAdapter } from "@corely/data";
import type { EventHandler, OutboxEvent } from "../../outbox/event-handler.interface";
import type { PrismaTaxEricJobRepoAdapter } from "@/modules/tax/infrastructure/prisma/prisma-tax-eric-job-repo.adapter";
import type { TaxEricArtifactKind, TaxEricArtifactRef } from "@corely/contracts";

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
    private readonly objectStorage: ObjectStoragePort,
    private readonly documentRepo: PrismaDocumentRepoAdapter,
    private readonly fileRepo: PrismaFileRepoAdapter
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

    if (job.status === "succeeded" || job.status === "failed") {
      return;
    }

    await this.ericJobRepo.markRunning({
      tenantId: workspaceId,
      jobId: job.id,
      startedAt: new Date(),
    });

    try {
      const artifacts = await this.persistArtifacts({
        workspaceId,
        jobId: job.id,
        reportId: job.reportId,
        action: job.action,
        requestPayload: job.requestPayload ?? {},
      });

      await this.ericJobRepo.markSucceeded({
        tenantId: workspaceId,
        jobId: job.id,
        finishedAt: new Date(),
        artifacts,
        responsePayload: {
          provider: "elster-gateway",
          status: "stubbed",
          message: "Processed by stubbed ERiC gateway pipeline.",
        },
      });
    } catch (error) {
      this.logger.error("tax_report_eric_job.failed", {
        tenantId,
        workspaceId,
        jobId: job.id,
        error,
      });
      await this.ericJobRepo.markFailed({
        tenantId: workspaceId,
        jobId: job.id,
        finishedAt: new Date(),
        errorMessage: error instanceof Error ? error.message : "ERiC job failed",
      });
      throw error;
    }
  }

  private async persistArtifacts(params: {
    workspaceId: string;
    jobId: string;
    reportId: string;
    action: string;
    requestPayload: Record<string, unknown>;
  }): Promise<TaxEricArtifactRef[]> {
    const now = new Date();
    const artifactDescriptors: Array<{
      kind: TaxEricArtifactKind;
      extension: string;
      contentType: string;
      content: string;
    }> = [
      {
        kind: "xml",
        extension: "xml",
        contentType: "application/xml",
        content: this.buildXmlContent(params),
      },
      {
        kind: "protocol_pdf",
        extension: "pdf",
        contentType: "application/pdf",
        content: this.buildProtocolContent(params),
      },
      {
        kind: "log",
        extension: "log",
        contentType: "text/plain",
        content: this.buildLogContent(params),
      },
    ];

    const artifacts: TaxEricArtifactRef[] = [];
    for (const descriptor of artifactDescriptors) {
      const fileName = `${descriptor.kind}-${params.jobId}.${descriptor.extension}`;
      const objectKey = `workspaces/${params.workspaceId}/tax-reports/${params.reportId}/eric/${params.jobId}/${fileName}`;
      const bytes = Buffer.from(descriptor.content, "utf-8");
      const upload = await this.objectStorage.putObject({
        tenantId: params.workspaceId,
        objectKey,
        contentType: descriptor.contentType,
        bytes,
      });

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
          contentType: descriptor.contentType,
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
        kind: descriptor.kind,
        documentId: document.id,
        fileName,
      });
    }

    return artifacts;
  }

  private buildXmlContent(params: {
    jobId: string;
    reportId: string;
    action: string;
    requestPayload: Record<string, unknown>;
  }): string {
    return [
      `<!-- Stub ERiC payload for job ${params.jobId} -->`,
      `<elsterGatewayRequest action="${params.action}" reportId="${params.reportId}">`,
      `  <payload>${this.escapeXml(JSON.stringify(params.requestPayload))}</payload>`,
      "</elsterGatewayRequest>",
    ].join("\n");
  }

  private buildProtocolContent(params: {
    jobId: string;
    reportId: string;
    action: string;
  }): string {
    return [
      "ERiC Protocol (Stub)",
      `Job: ${params.jobId}`,
      `Report: ${params.reportId}`,
      `Action: ${params.action}`,
      "Result: SUCCESS (stubbed)",
      "",
      "TODO: Replace with protocol artifact produced by the external elster-gateway service.",
    ].join("\n");
  }

  private buildLogContent(params: { jobId: string; reportId: string; action: string }): string {
    return [
      `[${new Date().toISOString()}] tax.report.eric.job.requested`,
      `jobId=${params.jobId}`,
      `reportId=${params.reportId}`,
      `action=${params.action}`,
      "gateway=elster-gateway",
      "status=succeeded(stub)",
    ].join("\n");
  }

  private escapeXml(value: string): string {
    return value
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&apos;");
  }
}
