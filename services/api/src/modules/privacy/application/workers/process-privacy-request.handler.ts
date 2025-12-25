import { Injectable } from "@nestjs/common";
import type { PrivacyRequestRepoPort } from "../ports/privacy-request-repository.port";
import type { ClockPort } from "@shared/ports/clock.port";
import type { DocumentsPort } from "../ports/documents.port";
import type { PersonalDataCollectorPort } from "../ports/personal-data-collector.port";
import type { PersonalDataItem } from "../ports/personal-data-collector.port";
import type { PersonalDataEraserPort } from "../ports/personal-data-eraser.port";
import type { ErasureResult } from "../ports/personal-data-eraser.port";

export interface ProcessPrivacyRequestPayload {
  requestId: string;
  tenantId: string;
}

@Injectable()
export class ProcessPrivacyRequestHandler {
  constructor(
    private readonly repo: PrivacyRequestRepoPort,
    private readonly clock: ClockPort,
    private readonly documents: DocumentsPort,
    private readonly collectors: PersonalDataCollectorPort[],
    private readonly erasers: PersonalDataEraserPort[]
  ) {}

  async handle(payload: ProcessPrivacyRequestPayload) {
    const request = await this.repo.findById(payload.tenantId, payload.requestId);
    if (!request) {
      return;
    }

    // Already handled
    if (request.status === "READY" || request.status === "COMPLETED") {
      return;
    }

    try {
      request.markProcessing(this.clock.now());
      await this.repo.save(request);

      if (request.type === "EXPORT") {
        const items: PersonalDataItem[] = [];
        for (const collector of this.collectors) {
          const collected = await collector.collectPersonalData({
            tenantId: request.tenantId,
            subjectUserId: request.subjectUserId,
          });
          items.push(...collected);
        }
        const artifact = {
          subjectUserId: request.subjectUserId,
          tenantId: request.tenantId,
          generatedAt: this.clock.now().toISOString(),
          items,
        };
        const { documentId } = await this.documents.createPrivacyExport({
          tenantId: request.tenantId,
          subjectUserId: request.subjectUserId,
          json: artifact,
        });
        request.markExportReady(documentId, this.clock.now());
      } else {
        const results: ErasureResult[] = [];
        for (const eraser of this.erasers) {
          const res = await eraser.erasePersonalData({
            tenantId: request.tenantId,
            subjectUserId: request.subjectUserId,
          });
          results.push(res);
        }
        const report = {
          subjectUserId: request.subjectUserId,
          tenantId: request.tenantId,
          processedAt: this.clock.now().toISOString(),
          results,
        };
        const { documentId } = await this.documents.createErasureReport({
          tenantId: request.tenantId,
          subjectUserId: request.subjectUserId,
          json: report,
        });
        request.markErasureCompleted(documentId, this.clock.now());
      }

      await this.repo.save(request);
    } catch (err: any) {
      request.markFailed(err?.message || "Unexpected error", this.clock.now());
      await this.repo.save(request);
      throw err;
    }
  }
}
