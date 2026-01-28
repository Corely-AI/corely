import {
  BaseUseCase,
  type Result,
  type UseCaseContext,
  type UseCaseError,
  ok,
  RequireTenant,
} from "@corely/kernel";
import type { ListLocationsInput, ListLocationsOutput } from "@corely/contracts";
import { toLocationDto } from "../mappers/inventory-dto.mapper";
import type { LocationDeps } from "./location.deps";

@RequireTenant()
export class ListLocationsUseCase extends BaseUseCase<ListLocationsInput, ListLocationsOutput> {
  constructor(private readonly locationDeps: LocationDeps) {
    super({ logger: locationDeps.logger });
  }

  protected async handle(
    input: ListLocationsInput,
    ctx: UseCaseContext
  ): Promise<Result<ListLocationsOutput, UseCaseError>> {
    const tenantId = ctx.tenantId!;

    const locations = await this.locationDeps.repo.listByWarehouse(tenantId, input.warehouseId);
    return ok({ items: locations.map(toLocationDto) });
  }
}
