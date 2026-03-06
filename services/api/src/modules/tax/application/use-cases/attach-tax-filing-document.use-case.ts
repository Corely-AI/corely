import { Injectable } from "@nestjs/common";
import type {
  AttachTaxFilingDocumentRequest,
  AttachTaxFilingDocumentResponse,
  DocumentLinkEntityType,
  TaxFilingActivityEvent,
} from "@corely/contracts";
import {
  BaseUseCase,
  type Result,
  type UseCaseContext,
  type UseCaseError,
  NotFoundError,
  ok,
  err,
  RequireTenant,
} from "@corely/kernel";
import { DocumentsApplication } from "../../../documents/application/documents.application";
import { TaxReportRepoPort } from "../../domain/ports";

export type AttachTaxFilingDocumentInput = {
  filingId: string;
  request: AttachTaxFilingDocumentRequest;
};

@RequireTenant()
@Injectable()
export class AttachTaxFilingDocumentUseCase extends BaseUseCase<
  AttachTaxFilingDocumentInput,
  AttachTaxFilingDocumentResponse
> {
  constructor(
    private readonly reportRepo: TaxReportRepoPort,
    private readonly documentsApp: DocumentsApplication
  ) {
    super({ logger: null as any });
  }

  protected async handle(
    input: AttachTaxFilingDocumentInput,
    ctx: UseCaseContext
  ): Promise<Result<AttachTaxFilingDocumentResponse, UseCaseError>> {
    const workspaceId = ctx.workspaceId || ctx.tenantId!;
    const report = await this.reportRepo.findById(workspaceId, input.filingId);
    if (!report) {
      return err(new NotFoundError("Filing not found"));
    }

    const linkResult = await this.documentsApp.linkDocument.execute(
      {
        documentId: input.request.documentId,
        entityType: "OTHER" as DocumentLinkEntityType,
        entityId: input.filingId,
      },
      ctx
    );
    if ("error" in linkResult) {
      return linkResult;
    }

    const docResult = await this.documentsApp.getDocument.execute(
      { documentId: input.request.documentId },
      ctx
    );
    if ("error" in docResult) {
      return docResult;
    }

    await this.reportRepo.updateMeta({
      tenantId: workspaceId,
      reportId: input.filingId,
      meta: {
        ...(report.meta ?? {}),
        activity: this.appendActivity(report.meta, {
          id: `${input.filingId}-attachment-added-${Date.now()}`,
          type: "attachmentAdded",
          timestamp: new Date().toISOString(),
          actor: ctx.userId ? { id: ctx.userId } : undefined,
          payload: {
            documentId: input.request.documentId,
            title: docResult.value.document.title ?? undefined,
          },
        }),
      },
    });

    return ok({ document: docResult.value.document });
  }

  private appendActivity(
    meta: Record<string, unknown> | null | undefined,
    event: TaxFilingActivityEvent
  ): TaxFilingActivityEvent[] {
    const current =
      meta && typeof meta === "object" && Array.isArray(meta.activity) ? meta.activity : [];
    const typed = current
      .map((item) => {
        if (!item || typeof item !== "object") {
          return null;
        }
        return item as TaxFilingActivityEvent;
      })
      .filter((item): item is TaxFilingActivityEvent => Boolean(item));
    return [...typed, event];
  }
}
