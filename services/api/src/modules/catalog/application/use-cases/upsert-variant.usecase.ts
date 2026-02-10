import {
  BaseUseCase,
  ConflictError,
  NotFoundError,
  RequireTenant,
  type Result,
  type UseCaseContext,
  type UseCaseError,
  ok,
} from "@corely/kernel";
import type { UpsertCatalogVariantInput, UpsertCatalogVariantOutput } from "@corely/contracts";
import { normalizeCatalogSku } from "../../domain/catalog-normalization";
import { scopeFromContext, type CatalogUseCaseDeps } from "./catalog.deps";

@RequireTenant()
export class UpsertCatalogVariantUseCase extends BaseUseCase<
  UpsertCatalogVariantInput,
  UpsertCatalogVariantOutput
> {
  constructor(private readonly depsRef: CatalogUseCaseDeps) {
    super({ logger: depsRef.logger });
  }

  protected async handle(
    input: UpsertCatalogVariantInput,
    ctx: UseCaseContext
  ): Promise<Result<UpsertCatalogVariantOutput, UseCaseError>> {
    const scope = scopeFromContext(ctx);
    const sku = normalizeCatalogSku(input.sku);

    if (!(await this.depsRef.repo.findItemById(scope, input.itemId))) {
      throw new NotFoundError("Catalog item not found");
    }

    const existingBySku = await this.depsRef.repo.findVariantBySku(scope, sku);
    if (existingBySku && existingBySku.id !== input.variantId) {
      throw new ConflictError("Catalog variant SKU already exists");
    }

    const now = this.depsRef.clock.now().toISOString();
    const id = input.variantId ?? this.depsRef.idGenerator.newId();
    const current = input.variantId
      ? await this.depsRef.repo.findVariantById(scope, input.variantId)
      : null;

    const variant = {
      id,
      tenantId: scope.tenantId,
      workspaceId: scope.workspaceId,
      itemId: input.itemId,
      sku,
      name: input.name ?? null,
      status: input.status ?? current?.status ?? "ACTIVE",
      attributes: input.attributes ?? current?.attributes ?? null,
      barcodes: current?.barcodes ?? [],
      createdAt: current?.createdAt ?? now,
      updatedAt: now,
      archivedAt: current?.archivedAt ?? null,
    };

    await this.depsRef.repo.upsertVariant(scope, variant);
    await this.depsRef.repo.replaceVariantBarcodes(scope, id, input.barcodes ?? []);

    const stored = await this.depsRef.repo.findVariantById(scope, id);
    if (!stored) {
      throw new NotFoundError("Catalog variant not found");
    }

    await this.depsRef.audit.log({
      tenantId: scope.tenantId,
      userId: ctx.userId ?? "system",
      action: input.variantId ? "catalog.variant.updated" : "catalog.variant.created",
      entityType: "CatalogVariant",
      entityId: stored.id,
      metadata: { workspaceId: scope.workspaceId },
    });

    await this.depsRef.outbox.enqueue({
      tenantId: scope.tenantId,
      eventType: input.variantId ? "catalog.variant.updated" : "catalog.variant.created",
      payload: { variantId: stored.id, itemId: stored.itemId, workspaceId: scope.workspaceId },
      correlationId: ctx.correlationId,
    });

    return ok({ variant: stored });
  }
}
