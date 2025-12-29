import {
  BaseUseCase,
  type LoggerPort,
  type Result,
  type UseCaseContext,
  type UseCaseError,
  ValidationError,
  err,
  ok,
} from "@kerniflow/kernel";
import type { ListSuppliersInput, ListSuppliersOutput } from "@kerniflow/contracts";
import type { SupplierQueryPort } from "../ports/supplier-query.port";

type SupplierDeps = {
  logger: LoggerPort;
  supplierQuery: SupplierQueryPort;
};

export class ListSuppliersUseCase extends BaseUseCase<ListSuppliersInput, ListSuppliersOutput> {
  constructor(private readonly deps: SupplierDeps) {
    super({ logger: deps.logger });
  }

  protected async handle(
    input: ListSuppliersInput,
    ctx: UseCaseContext
  ): Promise<Result<ListSuppliersOutput, UseCaseError>> {
    if (!ctx.tenantId) {
      return err(new ValidationError("tenantId missing from context"));
    }

    const result = await this.deps.supplierQuery.listSuppliers(ctx.tenantId, {
      search: input.search,
      cursor: input.cursor,
      pageSize: input.pageSize,
    });

    return ok({ suppliers: result.suppliers, nextCursor: result.nextCursor ?? null });
  }
}
