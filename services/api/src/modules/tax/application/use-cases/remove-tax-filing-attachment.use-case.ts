import { Injectable } from "@nestjs/common";
import type { DocumentLinkEntityType } from "@corely/contracts";
import {
  BaseUseCase,
  type Result,
  type UseCaseContext,
  type UseCaseError,
  ok,
  RequireTenant,
} from "@corely/kernel";
import { DocumentsApplication } from "../../../documents/application/documents.application";

export type RemoveTaxFilingAttachmentInput = {
  filingId: string;
  documentId: string;
};

@RequireTenant()
@Injectable()
export class RemoveTaxFilingAttachmentUseCase extends BaseUseCase<
  RemoveTaxFilingAttachmentInput,
  { removed: boolean }
> {
  constructor(private readonly documentsApp: DocumentsApplication) {
    super({ logger: null as any });
  }

  protected async handle(
    input: RemoveTaxFilingAttachmentInput,
    ctx: UseCaseContext
  ): Promise<Result<{ removed: boolean }, UseCaseError>> {
    const result = await this.documentsApp.unlinkDocument.execute(
      {
        documentId: input.documentId,
        entityType: "OTHER" as DocumentLinkEntityType,
        entityId: input.filingId,
      },
      ctx
    );
    if ("error" in result) {
      return result;
    }
    return ok({ removed: result.value.removed });
  }
}
