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
import type { UpdateReorderPolicyInput, UpdateReorderPolicyOutput } from "@corely/contracts";
import { toReorderPolicyDto } from "../mappers/inventory-dto.mapper";
import type { ReorderDeps } from "./reorder.deps";

@RequireTenant()
export class UpdateReorderPolicyUseCase extends BaseUseCase<
  UpdateReorderPolicyInput,
  UpdateReorderPolicyOutput
> {
  constructor(private readonly reorderDeps: ReorderDeps) {
    super({ logger: reorderDeps.logger });
  }

  protected async handle(
    input: UpdateReorderPolicyInput,
    ctx: UseCaseContext
  ): Promise<Result<UpdateReorderPolicyOutput, UseCaseError>> {
    const tenantId = ctx.tenantId!;
    if (!ctx.userId) {
      return err(new ValidationError("userId is required"));
    }

    const policy = await this.reorderDeps.repo.findById(tenantId, input.reorderPolicyId);
    if (!policy) {
      return err(new NotFoundError("Reorder policy not found"));
    }

    const updated = {
      ...policy,
      minQty: input.patch.minQty ?? policy.minQty,
      maxQty:
        input.patch.maxQty !== undefined ? (input.patch.maxQty ?? null) : (policy.maxQty ?? null),
      reorderPoint:
        input.patch.reorderPoint !== undefined
          ? (input.patch.reorderPoint ?? null)
          : (policy.reorderPoint ?? null),
      preferredSupplierPartyId:
        input.patch.preferredSupplierPartyId !== undefined
          ? (input.patch.preferredSupplierPartyId ?? null)
          : (policy.preferredSupplierPartyId ?? null),
      leadTimeDays:
        input.patch.leadTimeDays !== undefined
          ? (input.patch.leadTimeDays ?? null)
          : (policy.leadTimeDays ?? null),
      isActive: input.patch.isActive ?? policy.isActive,
      updatedAt: this.reorderDeps.clock.now(),
    };

    await this.reorderDeps.repo.save(tenantId, updated);
    await this.reorderDeps.audit.log({
      tenantId,
      userId: ctx.userId,
      action: "inventory.reorder-policy.updated",
      entityType: "ReorderPolicy",
      entityId: updated.id,
    });

    return ok({ policy: toReorderPolicyDto(updated) });
  }
}
