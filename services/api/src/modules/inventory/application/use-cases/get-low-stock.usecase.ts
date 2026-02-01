import {
  BaseUseCase,
  type Result,
  type UseCaseContext,
  type UseCaseError,
  ok,
  RequireTenant,
} from "@corely/kernel";
import type { GetLowStockInput, GetLowStockOutput } from "@corely/contracts";
import { type ReorderDeps, buildSuggestions } from "./reorder.deps";

@RequireTenant()
export class GetLowStockUseCase extends BaseUseCase<GetLowStockInput, GetLowStockOutput> {
  constructor(private readonly reorderDeps: ReorderDeps) {
    super({ logger: reorderDeps.logger });
  }

  protected async handle(
    input: GetLowStockInput,
    ctx: UseCaseContext
  ): Promise<Result<GetLowStockOutput, UseCaseError>> {
    const tenantId = ctx.tenantId!;

    const policies = await this.reorderDeps.repo.list(tenantId, {
      warehouseId: input.warehouseId,
    });

    const thresholdMode = input.thresholdMode ?? "REORDER_POINT";
    const items = await buildSuggestions({
      tenantId,
      policies,
      thresholdMode,
      locationRepo: this.reorderDeps.locationRepo,
      moveRepo: this.reorderDeps.moveRepo,
      reservationRepo: this.reorderDeps.reservationRepo,
    });

    return ok({ items });
  }
}
