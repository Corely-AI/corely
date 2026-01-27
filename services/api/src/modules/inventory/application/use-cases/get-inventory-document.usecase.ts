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
import type { GetInventoryDocumentInput, GetInventoryDocumentOutput } from "@corely/contracts";
import { toInventoryDocumentDto } from "../mappers/inventory-dto.mapper";
import type { DocumentDeps } from "./inventory-document.deps";

@RequireTenant()
export class GetInventoryDocumentUseCase extends BaseUseCase<
  GetInventoryDocumentInput,
  GetInventoryDocumentOutput
> {
  constructor(private readonly documentDeps: DocumentDeps) {
    super({ logger: documentDeps.logger });
  }

  protected async handle(
    input: GetInventoryDocumentInput,
    ctx: UseCaseContext
  ): Promise<Result<GetInventoryDocumentOutput, UseCaseError>> {
    const tenantId = ctx.tenantId!;
    const document = await this.documentDeps.repo.findById(tenantId, input.documentId);
    if (!document) {
      return err(new NotFoundError("Document not found"));
    }

    return ok({ document: toInventoryDocumentDto(document) });
  }
}
