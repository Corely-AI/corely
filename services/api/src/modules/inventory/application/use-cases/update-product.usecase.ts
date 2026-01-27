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
import type { UpdateProductInput, UpdateProductOutput } from "@corely/contracts";
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
export class UpdateProductUseCase extends BaseUseCase<UpdateProductInput, UpdateProductOutput> {
  constructor(private readonly productDeps: Deps) {
    super({ logger: productDeps.logger });
  }

  protected async handle(
    input: UpdateProductInput,
    ctx: UseCaseContext
  ): Promise<Result<UpdateProductOutput, UseCaseError>> {
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

    if (input.patch.sku && input.patch.sku !== product.sku) {
      const existing = await this.productDeps.repo.findBySku(tenantId, input.patch.sku);
      if (existing) {
        return err(new ValidationError("SKU already exists", { sku: input.patch.sku }));
      }
    }

    const updated = {
      ...product,
      sku: input.patch.sku ?? product.sku,
      name: input.patch.name ?? product.name,
      productType: input.patch.productType ?? product.productType,
      unitOfMeasure: input.patch.unitOfMeasure ?? product.unitOfMeasure,
      barcode:
        input.patch.barcode !== undefined
          ? (input.patch.barcode ?? null)
          : (product.barcode ?? null),
      defaultSalesPriceCents:
        input.patch.defaultSalesPriceCents !== undefined
          ? (input.patch.defaultSalesPriceCents ?? null)
          : (product.defaultSalesPriceCents ?? null),
      defaultPurchaseCostCents:
        input.patch.defaultPurchaseCostCents !== undefined
          ? (input.patch.defaultPurchaseCostCents ?? null)
          : (product.defaultPurchaseCostCents ?? null),
      isActive: input.patch.isActive ?? product.isActive,
      tags: input.patch.tags ?? product.tags,
      updatedAt: this.productDeps.clock.now(),
    };

    await this.productDeps.repo.save(tenantId, updated);
    await this.productDeps.audit.log({
      tenantId,
      userId,
      action: "inventory.product.updated",
      entityType: "InventoryProduct",
      entityId: updated.id,
    });

    return ok({ product: toProductDto(updated) });
  }
}
