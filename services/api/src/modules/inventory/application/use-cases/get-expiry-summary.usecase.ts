import {
  BaseUseCase,
  type LoggerPort,
  type Result,
  type UseCaseContext,
  type UseCaseError,
  ok,
  RequireTenant,
} from "@corely/kernel";
import type { GetExpirySummaryInput, GetExpirySummaryOutput, ExpiryItem } from "@corely/contracts";
import type { InventoryLotRepositoryPort } from "../ports/inventory-lot-repository.port";

type Deps = {
  logger: LoggerPort;
  repo: InventoryLotRepositoryPort;
};

@RequireTenant()
export class GetExpirySummaryUseCase extends BaseUseCase<
  GetExpirySummaryInput,
  GetExpirySummaryOutput
> {
  constructor(private readonly deps: Deps) {
    super({ logger: deps.logger });
  }

  protected async handle(
    input: GetExpirySummaryInput,
    ctx: UseCaseContext
  ): Promise<Result<GetExpirySummaryOutput, UseCaseError>> {
    const tenantId = ctx.tenantId!;
    const days = input.days ?? 30;

    const result = await this.deps.repo.getExpirySummary(tenantId, days);

    return ok({
      expiringSoon: result.expiringSoon.map((item) => this.toExpiryItemDto(item)),
      expired: result.expired.map((item) => this.toExpiryItemDto(item)),
      totalExpiringSoon: result.expiringSoon.length,
      totalExpired: result.expired.length,
    });
  }

  private toExpiryItemDto(item: any): ExpiryItem {
    return {
      lotId: item.lotId,
      lotNumber: item.lotNumber,
      productId: item.productId,
      productName: item.productName,
      expiryDate: item.expiryDate as string | null,
      qtyOnHand: item.qtyOnHand,
      daysUntilExpiry: item.daysUntilExpiry,
    };
  }
}
