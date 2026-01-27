import {
  BaseUseCase,
  type Result,
  type UseCaseContext,
  type UseCaseError,
  ValidationError,
  err,
  ok,
  RequireTenant,
} from "@corely/kernel";
import type { CreateWarehouseInput, CreateWarehouseOutput } from "@corely/contracts";
import { toWarehouseDto } from "../mappers/inventory-dto.mapper";
import { getIdempotentResult, storeIdempotentResult } from "./idempotency";
import type { WarehouseDeps } from "./warehouse.deps";

const DEFAULT_LOCATIONS = [
  { name: "Receiving", locationType: "RECEIVING" as const },
  { name: "Stock", locationType: "INTERNAL" as const },
  { name: "Shipping", locationType: "SHIPPING" as const },
];

@RequireTenant()
export class CreateWarehouseUseCase extends BaseUseCase<
  CreateWarehouseInput,
  CreateWarehouseOutput
> {
  constructor(private readonly warehouseDeps: WarehouseDeps) {
    super({ logger: warehouseDeps.logger });
  }

  protected async handle(
    input: CreateWarehouseInput,
    ctx: UseCaseContext
  ): Promise<Result<CreateWarehouseOutput, UseCaseError>> {
    const tenantId = ctx.tenantId!;
    if (!ctx.userId) {
      return err(new ValidationError("userId is required"));
    }

    const cached = await getIdempotentResult<CreateWarehouseOutput>({
      idempotency: this.warehouseDeps.idempotency,
      actionKey: "inventory.create-warehouse",
      tenantId,
      idempotencyKey: input.idempotencyKey,
    });
    if (cached) {
      return ok(cached);
    }

    const existingDefault = await this.warehouseDeps.repo.findDefault(tenantId);
    const isDefault = input.isDefault ?? !existingDefault;

    const now = this.warehouseDeps.clock.now();
    const warehouse = {
      id: this.warehouseDeps.idGenerator.newId(),
      tenantId,
      name: input.name,
      isDefault,
      address: input.address ?? null,
      createdAt: now,
      updatedAt: now,
    };

    await this.warehouseDeps.repo.create(tenantId, warehouse);

    for (const loc of DEFAULT_LOCATIONS) {
      await this.warehouseDeps.locationRepo.create(tenantId, {
        id: this.warehouseDeps.idGenerator.newId(),
        tenantId,
        warehouseId: warehouse.id,
        name: loc.name,
        locationType: loc.locationType,
        isActive: true,
        createdAt: now,
        updatedAt: now,
      });
    }

    await this.warehouseDeps.audit.log({
      tenantId,
      userId: ctx.userId,
      action: "inventory.warehouse.created",
      entityType: "InventoryWarehouse",
      entityId: warehouse.id,
    });

    const result = { warehouse: toWarehouseDto(warehouse) };
    await storeIdempotentResult({
      idempotency: this.warehouseDeps.idempotency,
      actionKey: "inventory.create-warehouse",
      tenantId,
      idempotencyKey: input.idempotencyKey,
      body: result,
    });

    return ok(result);
  }
}
