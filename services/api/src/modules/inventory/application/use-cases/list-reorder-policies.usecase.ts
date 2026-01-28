import {
  BaseUseCase,
  type Result,
  type UseCaseContext,
  type UseCaseError,
  ok,
  RequireTenant,
} from "@corely/kernel";
import type { ListReorderPoliciesInput, ListReorderPoliciesOutput } from "@corely/contracts";
import { toReorderPolicyDto } from "../mappers/inventory-dto.mapper";
import type { ReorderDeps } from "./reorder.deps";

@RequireTenant()
export class ListReorderPoliciesUseCase extends BaseUseCase<
  ListReorderPoliciesInput,
  ListReorderPoliciesOutput
> {
  constructor(private readonly reorderDeps: ReorderDeps) {
    super({ logger: reorderDeps.logger });
  }

  protected async handle(
    input: ListReorderPoliciesInput,
    ctx: UseCaseContext
  ): Promise<Result<ListReorderPoliciesOutput, UseCaseError>> {
    const tenantId = ctx.tenantId!;

    const policies = await this.reorderDeps.repo.list(tenantId, {
      productId: input.productId,
      warehouseId: input.warehouseId,
    });

    return ok({ items: policies.map(toReorderPolicyDto) });
  }
}
