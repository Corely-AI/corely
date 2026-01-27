import {
  BaseUseCase,
  type ClockPort,
  type IdGeneratorPort,
  type LoggerPort,
  type Result,
  type UseCaseContext,
  type UseCaseError,
  ValidationError,
  type AuditPort,
  err,
  ok,
  RequireTenant,
} from "@corely/kernel";
import type { CreateProductInput, CreateProductOutput } from "@corely/contracts";
import type { ProductRepositoryPort } from "../ports/product-repository.port";
import { toProductDto } from "../mappers/inventory-dto.mapper";
import type { IdempotencyStoragePort } from "../../../../shared/ports/idempotency-storage.port";
import { getIdempotentResult, storeIdempotentResult } from "./idempotency";

type Deps = {
  logger: LoggerPort;
  repo: ProductRepositoryPort;
  idGenerator: IdGeneratorPort;
  clock: ClockPort;
  idempotency: IdempotencyStoragePort;
  audit: AuditPort;
};

@RequireTenant()
export class CreateProductUseCase extends BaseUseCase<CreateProductInput, CreateProductOutput> {
  constructor(private readonly productDeps: Deps) {
    super({ logger: productDeps.logger });
  }

  protected async handle(
    input: CreateProductInput,
    ctx: UseCaseContext
  ): Promise<Result<CreateProductOutput, UseCaseError>> {
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    const tenantId = ctx.tenantId!;
    // userId is still possibly undefined by type, but strongly recommended
    if (!ctx.userId) {
      return err(new ValidationError("userId is required"));
    }
    const userId = ctx.userId;

    const cached = await getIdempotentResult<CreateProductOutput>({
      idempotency: this.productDeps.idempotency,
      actionKey: "inventory.create-product",
      tenantId,
      idempotencyKey: input.idempotencyKey,
    });
    if (cached) {
      return ok(cached);
    }

    const existing = await this.productDeps.repo.findBySku(tenantId, input.sku);
    if (existing) {
      return err(new ValidationError("SKU already exists", { sku: input.sku }));
    }

    const now = this.productDeps.clock.now();
    const product = {
      id: this.productDeps.idGenerator.newId(),
      tenantId,
      sku: input.sku,
      name: input.name,
      productType: input.productType,
      unitOfMeasure: input.unitOfMeasure,
      barcode: input.barcode ?? null,
      defaultSalesPriceCents: input.defaultSalesPriceCents ?? null,
      defaultPurchaseCostCents: input.defaultPurchaseCostCents ?? null,
      isActive: input.isActive ?? true,
      tags: input.tags ?? [],
      createdAt: now,
      updatedAt: now,
    };

    await this.productDeps.repo.create(tenantId, product);

    await this.productDeps.audit.log({
      tenantId,
      userId,
      action: "inventory.product.created",
      entityType: "InventoryProduct",
      entityId: product.id,
    });

    const result = { product: toProductDto(product) };
    await storeIdempotentResult({
      idempotency: this.productDeps.idempotency,
      actionKey: "inventory.create-product",
      tenantId,
      idempotencyKey: input.idempotencyKey,
      body: result,
    });

    return ok(result);
  }
}
