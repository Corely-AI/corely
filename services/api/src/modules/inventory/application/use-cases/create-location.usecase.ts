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
import type { CreateLocationInput, CreateLocationOutput } from "@corely/contracts";
import { toLocationDto } from "../mappers/inventory-dto.mapper";
import { getIdempotentResult, storeIdempotentResult } from "./idempotency";
import type { LocationDeps } from "./location.deps";

@RequireTenant()
export class CreateLocationUseCase extends BaseUseCase<CreateLocationInput, CreateLocationOutput> {
  constructor(private readonly locationDeps: LocationDeps) {
    super({ logger: locationDeps.logger });
  }

  protected async handle(
    input: CreateLocationInput,
    ctx: UseCaseContext
  ): Promise<Result<CreateLocationOutput, UseCaseError>> {
    const tenantId = ctx.tenantId!;
    if (!ctx.userId) {
      return err(new ValidationError("userId is required"));
    }

    const cached = await getIdempotentResult<CreateLocationOutput>({
      idempotency: this.locationDeps.idempotency,
      actionKey: "inventory.create-location",
      tenantId,
      idempotencyKey: input.idempotencyKey,
    });
    if (cached) {
      return ok(cached);
    }

    const warehouse = await this.locationDeps.warehouseRepo.findById(tenantId, input.warehouseId);
    if (!warehouse) {
      return err(new NotFoundError("Warehouse not found"));
    }

    const now = this.locationDeps.clock.now();
    const location = {
      id: this.locationDeps.idGenerator.newId(),
      tenantId,
      warehouseId: input.warehouseId,
      name: input.name,
      locationType: input.locationType,
      isActive: input.isActive ?? true,
      createdAt: now,
      updatedAt: now,
    };

    await this.locationDeps.repo.create(tenantId, location);
    await this.locationDeps.audit.log({
      tenantId,
      userId: ctx.userId,
      action: "inventory.location.created",
      entityType: "InventoryLocation",
      entityId: location.id,
    });

    const result = { location: toLocationDto(location) };
    await storeIdempotentResult({
      idempotency: this.locationDeps.idempotency,
      actionKey: "inventory.create-location",
      tenantId,
      idempotencyKey: input.idempotencyKey,
      body: result,
    });

    return ok(result);
  }
}
