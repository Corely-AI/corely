import {
  BaseUseCase,
  type Result,
  type UseCaseContext,
  type UseCaseError,
  ok,
  RequireTenant,
} from "@corely/kernel";
import type { ListPurchaseOrdersInput, ListPurchaseOrdersOutput } from "@corely/contracts";
import { toPurchaseOrderDto } from "../mappers/purchasing-dto.mapper";
import type { PurchaseOrderDeps } from "./purchasing-order.deps";

@RequireTenant()
export class ListPurchaseOrdersUseCase extends BaseUseCase<
  ListPurchaseOrdersInput,
  ListPurchaseOrdersOutput
> {
  constructor(private readonly services: PurchaseOrderDeps) {
    super({ logger: services.logger });
  }

  protected async handle(
    input: ListPurchaseOrdersInput,
    ctx: UseCaseContext
  ): Promise<Result<ListPurchaseOrdersOutput, UseCaseError>> {
    const tenantId = ctx.tenantId!;

    const result = await this.services.repo.list(tenantId, {
      status: input.status,
      supplierPartyId: input.supplierPartyId,
      fromDate: input.fromDate,
      toDate: input.toDate,
      search: input.search,
      cursor: input.cursor,
      pageSize: input.pageSize,
    });

    return ok({
      items: result.items.map(toPurchaseOrderDto),
      nextCursor: result.nextCursor ?? null,
    });
  }
}
