import {
  BaseUseCase,
  parseLocalDate,
  type Result,
  type UseCaseContext,
  type UseCaseError,
  ok,
  RequireTenant,
} from "@corely/kernel";
import type { ListStockMovesInput, ListStockMovesOutput } from "@corely/contracts";
import { toStockMoveDto } from "../mappers/inventory-dto.mapper";
import { type StockDeps, buildLocationFilter } from "./stock.deps";

@RequireTenant()
export class ListStockMovesUseCase extends BaseUseCase<ListStockMovesInput, ListStockMovesOutput> {
  constructor(protected readonly deps: StockDeps) {
    super({ logger: deps.logger });
  }

  protected async handle(
    input: ListStockMovesInput,
    ctx: UseCaseContext
  ): Promise<Result<ListStockMovesOutput, UseCaseError>> {
    const tenantId = ctx.tenantId!;

    const locationIds = await buildLocationFilter({
      tenantId,
      warehouseId: input.warehouseId,
      locationId: undefined,
      locationRepo: this.deps.locationRepo,
    });

    const result = await this.deps.moveRepo.list(tenantId, {
      productId: input.productId,
      locationIds,
      fromDate: input.fromDate ? parseLocalDate(input.fromDate) : undefined,
      toDate: input.toDate ? parseLocalDate(input.toDate) : undefined,
      cursor: input.cursor,
      pageSize: input.pageSize,
    });

    return ok({
      items: result.items.map(toStockMoveDto),
      nextCursor: result.nextCursor ?? null,
    });
  }
}
