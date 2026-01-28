import {
  BaseUseCase,
  type Result,
  type UseCaseContext,
  type UseCaseError,
  ValidationError,
  NotFoundError,
  err,
  ok,
  RequireTenant,
} from "@corely/kernel";
import type { UpdateWarehouseInput, UpdateWarehouseOutput } from "@corely/contracts";
import { toWarehouseDto } from "../mappers/inventory-dto.mapper";
import type { WarehouseDeps } from "./warehouse.deps";

@RequireTenant()
export class UpdateWarehouseUseCase extends BaseUseCase<
  UpdateWarehouseInput,
  UpdateWarehouseOutput
> {
  constructor(private readonly warehouseDeps: WarehouseDeps) {
    super({ logger: warehouseDeps.logger });
  }

  protected async handle(
    input: UpdateWarehouseInput,
    ctx: UseCaseContext
  ): Promise<Result<UpdateWarehouseOutput, UseCaseError>> {
    const tenantId = ctx.tenantId!;
    if (!ctx.userId) {
      return err(new ValidationError("userId is required"));
    }

    const warehouse = await this.warehouseDeps.repo.findById(tenantId, input.warehouseId);
    if (!warehouse) {
      return err(new NotFoundError("Warehouse not found"));
    }

    const updated = {
      ...warehouse,
      name: input.patch.name ?? warehouse.name,
      isDefault: input.patch.isDefault ?? warehouse.isDefault,
      address:
        input.patch.address !== undefined
          ? (input.patch.address ?? null)
          : (warehouse.address ?? null),
      updatedAt: this.warehouseDeps.clock.now(),
    };

    await this.warehouseDeps.repo.save(tenantId, updated);
    await this.warehouseDeps.audit.log({
      tenantId,
      userId: ctx.userId,
      action: "inventory.warehouse.updated",
      entityType: "InventoryWarehouse",
      entityId: updated.id,
    });

    return ok({ warehouse: toWarehouseDto(updated) });
  }
}
