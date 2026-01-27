import {
  BaseUseCase,
  type Result,
  type UseCaseContext,
  type UseCaseError,
  ok,
  RequireTenant,
} from "@corely/kernel";
import type { ListSuppliersInput, ListSuppliersOutput } from "@corely/contracts";
import type { SupplierDeps } from "./purchasing-supplier.deps";

@RequireTenant()
export class ListSuppliersUseCase extends BaseUseCase<ListSuppliersInput, ListSuppliersOutput> {
  constructor(private readonly services: SupplierDeps) {
    super({ logger: services.logger });
  }

  protected async handle(
    input: ListSuppliersInput,
    ctx: UseCaseContext
  ): Promise<Result<ListSuppliersOutput, UseCaseError>> {
    const tenantId = ctx.tenantId!;

    const result = await this.services.supplierQuery.listSuppliers(tenantId, {
      search: input.search,
      cursor: input.cursor,
      pageSize: input.pageSize,
    });

    return ok({ suppliers: result.suppliers, nextCursor: result.nextCursor ?? null });
  }
}
