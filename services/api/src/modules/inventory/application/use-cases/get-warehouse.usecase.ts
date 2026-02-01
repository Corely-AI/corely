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
import type { GetWarehouseInput, GetWarehouseOutput } from "@corely/contracts";
import { toWarehouseDto } from "../mappers/inventory-dto.mapper";
import type { WarehouseDeps } from "./warehouse.deps";

@RequireTenant()
export class GetWarehouseUseCase extends BaseUseCase<GetWarehouseInput, GetWarehouseOutput> {
  constructor(private readonly warehouseDeps: WarehouseDeps) {
    super({ logger: warehouseDeps.logger });
  }

  protected async handle(
    input: GetWarehouseInput,
    ctx: UseCaseContext
  ): Promise<Result<GetWarehouseOutput, UseCaseError>> {
    const tenantId = ctx.tenantId!;
    const warehouse = await this.warehouseDeps.repo.findById(tenantId, input.warehouseId);
    if (!warehouse) {
      return err(new NotFoundError("Warehouse not found"));
    }

    return ok({ warehouse: toWarehouseDto(warehouse) });
  }
}
