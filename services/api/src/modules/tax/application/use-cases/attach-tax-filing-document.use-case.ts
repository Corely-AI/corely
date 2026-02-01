import { Injectable } from "@nestjs/common";
import type {
  AttachTaxFilingDocumentRequest,
  AttachTaxFilingDocumentResponse,
  DocumentLinkEntityType,
} from "@corely/contracts";
import {
  BaseUseCase,
  type Result,
  type UseCaseContext,
  type UseCaseError,
  ok,
  RequireTenant,
} from "@corely/kernel";
import { DocumentsApplication } from "../../../documents/application/documents.application";

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
  constructor(private readonly documentsApp: DocumentsApplication) {
    super({ logger: null as any });
  }

  protected async handle(
    input: AttachTaxFilingDocumentInput,
    ctx: UseCaseContext
  ): Promise<Result<AttachTaxFilingDocumentResponse, UseCaseError>> {
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

    return ok({ document: docResult.value.document });
  }
}
