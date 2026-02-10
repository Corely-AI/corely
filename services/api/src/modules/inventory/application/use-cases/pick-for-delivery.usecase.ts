import {
  BaseUseCase,
  type LoggerPort,
  type Result,
  type UseCaseContext,
  type UseCaseError,
  ok,
  RequireTenant,
} from "@corely/kernel";
import type { PickForDeliveryInput, PickForDeliveryOutput } from "@corely/contracts";
import type { InventoryLotRepositoryPort } from "../ports/inventory-lot-repository.port";
import {
  pickMultipleFEFO,
  calculateWeightedAverageCost,
  type PickRequest,
} from "../../domain/fefo-picker";

type Deps = {
  logger: LoggerPort;
  lotRepo: InventoryLotRepositoryPort;
};

@RequireTenant()
export class PickForDeliveryUseCase extends BaseUseCase<
  PickForDeliveryInput,
  PickForDeliveryOutput
> {
  constructor(private readonly deps: Deps) {
    super({ logger: deps.logger });
  }

  protected async handle(
    input: PickForDeliveryInput,
    ctx: UseCaseContext
  ): Promise<Result<PickForDeliveryOutput, UseCaseError>> {
    const tenantId = ctx.tenantId!;

    // Fetch available lots for all requested products
    const productIds = input.lines.map((line) => line.productId);
    const lotsByProduct = new Map();

    for (const productId of productIds) {
      const lotsResult = await this.deps.lotRepo.list(tenantId, {
        productId,
        status: "AVAILABLE",
        qtyOnHandGt: 0,
        limit: 100, // Reasonable limit for picking
      });
      lotsByProduct.set(productId, lotsResult.lots);
    }

    // Create pick requests
    const pickRequests: PickRequest[] = input.lines.map((line) => ({
      productId: line.productId,
      quantityRequested: line.quantityRequested,
    }));

    // Execute FEFO picking
    const pickResults = pickMultipleFEFO(pickRequests, lotsByProduct);

    // Check if all allocations were successful
    const allocationSuccessful = pickResults.every((result) => result.shortfall === 0);

    // Format output
    const picks = pickResults.map((result) => ({
      productId: result.productId,
      quantityRequested: result.quantityRequested,
      quantityAllocated: result.quantityAllocated,
      shortfall: result.shortfall,
      allocations: result.allocations,
      weightedAverageCostCents: calculateWeightedAverageCost(result),
    }));

    return ok({
      picks,
      allocationSuccessful,
    });
  }
}
