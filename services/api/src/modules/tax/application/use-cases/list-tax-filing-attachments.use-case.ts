import { Injectable } from "@nestjs/common";
import type { TaxFilingAttachmentsResponse, DocumentLinkEntityType } from "@corely/contracts";
import {
  BaseUseCase,
  type Result,
  type UseCaseContext,
  type UseCaseError,
  ok,
  RequireTenant,
} from "@corely/kernel";
import { DocumentsApplication } from "../../../documents/application/documents.application";

@RequireTenant()
@Injectable()
export class ListTaxFilingAttachmentsUseCase extends BaseUseCase<
  string,
  TaxFilingAttachmentsResponse
> {
  constructor(private readonly documentsApp: DocumentsApplication) {
    super({ logger: null as any });
  }

  protected async handle(
    filingId: string,
    ctx: UseCaseContext
  ): Promise<Result<TaxFilingAttachmentsResponse, UseCaseError>> {
    const result = await this.documentsApp.listLinkedDocuments.execute(
      { entityType: "OTHER" as DocumentLinkEntityType, entityId: filingId },
      ctx
    );
    if ("error" in result) {
      return result;
    }
    return ok({ items: result.value.items });
  }
}
