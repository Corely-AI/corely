import {
  BaseUseCase,
  type Result,
  type UseCaseContext,
  type UseCaseError,
  parseLocalDate,
  ok,
  RequireTenant,
} from "@corely/kernel";
import type { ListInventoryDocumentsInput, ListInventoryDocumentsOutput } from "@corely/contracts";
import { toInventoryDocumentDto } from "../mappers/inventory-dto.mapper";
import type { DocumentDeps } from "./inventory-document.deps";

@RequireTenant()
export class ListInventoryDocumentsUseCase extends BaseUseCase<
  ListInventoryDocumentsInput,
  ListInventoryDocumentsOutput
> {
  constructor(private readonly documentDeps: DocumentDeps) {
    super({ logger: documentDeps.logger });
  }

  protected async handle(
    input: ListInventoryDocumentsInput,
    ctx: UseCaseContext
  ): Promise<Result<ListInventoryDocumentsOutput, UseCaseError>> {
    const tenantId = ctx.tenantId!;

    const result = await this.documentDeps.repo.list(tenantId, {
      type: input.type,
      status: input.status,
      partyId: input.partyId,
      fromDate: input.fromDate ? parseLocalDate(input.fromDate) : undefined,
      toDate: input.toDate ? parseLocalDate(input.toDate) : undefined,
      search: input.search,
      cursor: input.cursor,
      pageSize: input.pageSize,
    });

    return ok({
      items: result.items.map(toInventoryDocumentDto),
      nextCursor: result.nextCursor ?? null,
    });
  }
}
