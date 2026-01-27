import {
  BaseUseCase,
  type Result,
  type UseCaseContext,
  type UseCaseError,
  ok,
  RequireTenant,
} from "@corely/kernel";
import type { ListWarehousesInput, ListWarehousesOutput } from "@corely/contracts";
import { toWarehouseDto } from "../mappers/inventory-dto.mapper";
import type { WarehouseDeps } from "./warehouse.deps";

@RequireTenant()
export class ListWarehousesUseCase extends BaseUseCase<ListWarehousesInput, ListWarehousesOutput> {
  constructor(private readonly warehouseDeps: WarehouseDeps) {
    super({ logger: warehouseDeps.logger });
  }

  protected async handle(
    input: ListWarehousesInput,
    ctx: UseCaseContext
  ): Promise<Result<ListWarehousesOutput, UseCaseError>> {
    const tenantId = ctx.tenantId!;

    const result = await this.warehouseDeps.repo.list(tenantId, {
      cursor: input.cursor,
      pageSize: input.pageSize,
    });

    return ok({
      items: result.items.map(toWarehouseDto),
      nextCursor: result.nextCursor ?? null,
    });
  }
}
