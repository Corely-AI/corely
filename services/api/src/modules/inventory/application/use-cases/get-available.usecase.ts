import {
  BaseUseCase,
  type Result,
  type UseCaseContext,
  type UseCaseError,
  ok,
  RequireTenant,
} from "@corely/kernel";
import type { GetAvailableInput, GetAvailableOutput } from "@corely/contracts";
import { toStockLevelDto } from "../mappers/inventory-dto.mapper";
import { type StockDeps, buildLocationFilter } from "./stock.deps";

@RequireTenant()
export class GetAvailableUseCase extends BaseUseCase<GetAvailableInput, GetAvailableOutput> {
  constructor(protected readonly deps: StockDeps) {
    super({ logger: deps.logger });
  }

  protected async handle(
    input: GetAvailableInput,
    ctx: UseCaseContext
  ): Promise<Result<GetAvailableOutput, UseCaseError>> {
    const tenantId = ctx.tenantId!;

    const locationIds = await buildLocationFilter({
      tenantId,
      warehouseId: input.warehouseId,
      locationId: input.locationId,
      locationRepo: this.deps.locationRepo,
    });

    const onHand = await this.deps.moveRepo.sumByProductLocation(tenantId, {
      productIds: input.productId ? [input.productId] : undefined,
      locationIds,
    });

    const reservations = await this.deps.reservationRepo.sumActiveByProductLocation(tenantId, {
      productIds: input.productId ? [input.productId] : undefined,
      locationIds,
    });

    const key = (productId: string, locationId: string) => `${productId}:${locationId}`;
    const reservedMap = new Map<string, number>();
    reservations.forEach((row) => {
      reservedMap.set(key(row.productId, row.locationId), row.reservedQty);
    });

    const items = onHand.map((row) => {
      const reservedQty = reservedMap.get(key(row.productId, row.locationId)) ?? 0;
      const availableQty = row.quantityDelta - reservedQty;
      return toStockLevelDto({
        productId: row.productId,
        locationId: row.locationId,
        onHandQty: row.quantityDelta,
        reservedQty,
        availableQty,
      });
    });

    return ok({ items });
  }
}
