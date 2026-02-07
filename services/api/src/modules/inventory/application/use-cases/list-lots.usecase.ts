import {
  BaseUseCase,
  type LoggerPort,
  type Result,
  type UseCaseContext,
  type UseCaseError,
  ok,
  RequireTenant,
  parseLocalDate,
} from "@corely/kernel";
import type { ListLotsInput, ListLotsOutput } from "@corely/contracts";
import type { InventoryLotRepositoryPort } from "../ports/inventory-lot-repository.port";
import { toInventoryLotDto } from "../mappers/inventory-dto.mapper";

type Deps = {
  logger: LoggerPort;
  repo: InventoryLotRepositoryPort;
};

@RequireTenant()
export class ListLotsUseCase extends BaseUseCase<ListLotsInput, ListLotsOutput> {
  constructor(private readonly deps: Deps) {
    super({ logger: deps.logger });
  }

  protected async handle(
    input: ListLotsInput,
    ctx: UseCaseContext
  ): Promise<Result<ListLotsOutput, UseCaseError>> {
    const tenantId = ctx.tenantId!;

    const result = await this.deps.repo.list(tenantId, {
      productId: input.productId,
      status: input.status,
      expiryBefore: input.expiryBefore ? parseLocalDate(input.expiryBefore) : undefined,
      expiryAfter: input.expiryAfter ? parseLocalDate(input.expiryAfter) : undefined,
      shipmentId: input.shipmentId,
      supplierPartyId: input.supplierPartyId,
      qtyOnHandGt: input.qtyOnHandGt,
      limit: input.limit,
      offset: input.offset,
    });

    return ok({
      lots: result.lots.map(toInventoryLotDto),
      total: result.total,
    });
  }
}
