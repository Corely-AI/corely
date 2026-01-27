import {
  BaseUseCase,
  type ClockPort,
  type IdGeneratorPort,
  type LoggerPort,
  type Result,
  type UseCaseContext,
  type UseCaseError,
  ValidationError,
  NotFoundError,
  type AuditPort,
  err,
  ok,
  RequireTenant,
} from "@corely/kernel";
import type { DeactivateProductInput, DeactivateProductOutput } from "@corely/contracts";
import type { ProductRepositoryPort } from "../ports/product-repository.port";
import { toProductDto } from "../mappers/inventory-dto.mapper";
import type { IdempotencyStoragePort } from "../../../../shared/ports/idempotency-storage.port";

type Deps = {
  logger: LoggerPort;
  repo: ProductRepositoryPort;
  idGenerator: IdGeneratorPort;
  clock: ClockPort;
  idempotency: IdempotencyStoragePort;
  audit: AuditPort;
};

@RequireTenant()
export class DeactivateProductUseCase extends BaseUseCase<
  DeactivateProductInput,
  DeactivateProductOutput
> {
  constructor(private readonly productDeps: Deps) {
    super({ logger: productDeps.logger });
  }

  protected async handle(
    input: DeactivateProductInput,
    ctx: UseCaseContext
  ): Promise<Result<DeactivateProductOutput, UseCaseError>> {
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    const tenantId = ctx.tenantId!;
    if (!ctx.userId) {
      return err(new ValidationError("userId is required"));
    }
    const userId = ctx.userId;

    const product = await this.productDeps.repo.findById(tenantId, input.productId);
    if (!product) {
      return err(new NotFoundError("Product not found"));
    }

    const updated = { ...product, isActive: false, updatedAt: this.productDeps.clock.now() };
    await this.productDeps.repo.save(tenantId, updated);
    await this.productDeps.audit.log({
      tenantId,
      userId,
      action: "inventory.product.deactivated",
      entityType: "InventoryProduct",
      entityId: updated.id,
    });

    return ok({ product: toProductDto(updated) });
  }
}
