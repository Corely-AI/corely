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
import type { UpdateLocationInput, UpdateLocationOutput } from "@corely/contracts";
import { toLocationDto } from "../mappers/inventory-dto.mapper";
import type { LocationDeps } from "./location.deps";

@RequireTenant()
export class UpdateLocationUseCase extends BaseUseCase<UpdateLocationInput, UpdateLocationOutput> {
  constructor(private readonly locationDeps: LocationDeps) {
    super({ logger: locationDeps.logger });
  }

  protected async handle(
    input: UpdateLocationInput,
    ctx: UseCaseContext
  ): Promise<Result<UpdateLocationOutput, UseCaseError>> {
    const tenantId = ctx.tenantId!;
    if (!ctx.userId) {
      return err(new ValidationError("userId is required"));
    }

    const location = await this.locationDeps.repo.findById(tenantId, input.locationId);
    if (!location) {
      return err(new NotFoundError("Location not found"));
    }

    const updated = {
      ...location,
      name: input.patch.name ?? location.name,
      locationType: input.patch.locationType ?? location.locationType,
      isActive: input.patch.isActive ?? location.isActive,
      updatedAt: this.locationDeps.clock.now(),
    };

    await this.locationDeps.repo.save(tenantId, updated);
    await this.locationDeps.audit.log({
      tenantId,
      userId: ctx.userId,
      action: "inventory.location.updated",
      entityType: "InventoryLocation",
      entityId: updated.id,
    });

    return ok({ location: toLocationDto(updated) });
  }
}
