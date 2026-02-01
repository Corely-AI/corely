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
import type { CreateReorderPolicyInput, CreateReorderPolicyOutput } from "@corely/contracts";
import { toReorderPolicyDto } from "../mappers/inventory-dto.mapper";
import { getIdempotentResult, storeIdempotentResult } from "./idempotency";
import type { ReorderDeps } from "./reorder.deps";

@RequireTenant()
export class CreateReorderPolicyUseCase extends BaseUseCase<
  CreateReorderPolicyInput,
  CreateReorderPolicyOutput
> {
  constructor(private readonly reorderDeps: ReorderDeps) {
    super({ logger: reorderDeps.logger });
  }

  protected async handle(
    input: CreateReorderPolicyInput,
    ctx: UseCaseContext
  ): Promise<Result<CreateReorderPolicyOutput, UseCaseError>> {
    const tenantId = ctx.tenantId!;
    if (!ctx.userId) {
      return err(new ValidationError("userId is required"));
    }

    const cached = await getIdempotentResult<CreateReorderPolicyOutput>({
      idempotency: this.reorderDeps.idempotency,
      actionKey: "inventory.create-reorder-policy",
      tenantId,
      idempotencyKey: input.idempotencyKey,
    });
    if (cached) {
      return ok(cached);
    }

    const product = await this.reorderDeps.productRepo.findById(tenantId, input.productId);
    if (!product) {
      return err(new NotFoundError("Product not found"));
    }

    const warehouse = await this.reorderDeps.warehouseRepo.findById(tenantId, input.warehouseId);
    if (!warehouse) {
      return err(new NotFoundError("Warehouse not found"));
    }

    const existing = await this.reorderDeps.repo.findByProductWarehouse(
      tenantId,
      input.productId,
      input.warehouseId
    );
    if (existing) {
      return err(new ValidationError("Reorder policy already exists"));
    }

    const now = this.reorderDeps.clock.now();
    const policy = {
      id: this.reorderDeps.idGenerator.newId(),
      tenantId,
      productId: input.productId,
      warehouseId: input.warehouseId,
      minQty: input.minQty,
      maxQty: input.maxQty ?? null,
      reorderPoint: input.reorderPoint ?? null,
      preferredSupplierPartyId: input.preferredSupplierPartyId ?? null,
      leadTimeDays: input.leadTimeDays ?? null,
      isActive: input.isActive ?? true,
      createdAt: now,
      updatedAt: now,
    };

    await this.reorderDeps.repo.create(tenantId, policy);
    await this.reorderDeps.audit.log({
      tenantId,
      userId: ctx.userId,
      action: "inventory.reorder-policy.created",
      entityType: "ReorderPolicy",
      entityId: policy.id,
    });

    const result = { policy: toReorderPolicyDto(policy) };
    await storeIdempotentResult({
      idempotency: this.reorderDeps.idempotency,
      actionKey: "inventory.create-reorder-policy",
      tenantId,
      idempotencyKey: input.idempotencyKey,
      body: result,
    });

    return ok(result);
  }
}
