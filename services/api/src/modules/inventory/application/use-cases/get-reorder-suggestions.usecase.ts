import {
  BaseUseCase,
  type Result,
  type UseCaseContext,
  type UseCaseError,
  ok,
  RequireTenant,
} from "@corely/kernel";
import type { GetReorderSuggestionsInput, GetReorderSuggestionsOutput } from "@corely/contracts";
import { type ReorderDeps, buildSuggestions } from "./reorder.deps";

@RequireTenant()
export class GetReorderSuggestionsUseCase extends BaseUseCase<
  GetReorderSuggestionsInput,
  GetReorderSuggestionsOutput
> {
  constructor(private readonly reorderDeps: ReorderDeps) {
    super({ logger: reorderDeps.logger });
  }

  protected async handle(
    input: GetReorderSuggestionsInput,
    ctx: UseCaseContext
  ): Promise<Result<GetReorderSuggestionsOutput, UseCaseError>> {
    const tenantId = ctx.tenantId!;

    const policies = await this.reorderDeps.repo.list(tenantId, {
      warehouseId: input.warehouseId,
    });

    const items = await buildSuggestions({
      tenantId,
      policies,
      thresholdMode: "REORDER_POINT",
      locationRepo: this.reorderDeps.locationRepo,
      moveRepo: this.reorderDeps.moveRepo,
      reservationRepo: this.reorderDeps.reservationRepo,
    });
    return ok({ items });
  }
}
