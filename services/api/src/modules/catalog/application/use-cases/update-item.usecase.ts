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
import type { UpdateCatalogItemInput, UpdateCatalogItemOutput } from "@corely/contracts";
import { normalizeCatalogCode } from "../../domain/catalog-normalization";
import { scopeFromContext, type CatalogUseCaseDeps } from "./catalog.deps";

@RequireTenant()
export class UpdateCatalogItemUseCase extends BaseUseCase<
  UpdateCatalogItemInput,
  UpdateCatalogItemOutput
> {
  constructor(private readonly depsRef: CatalogUseCaseDeps) {
    super({ logger: depsRef.logger });
  }

  protected async handle(
    input: UpdateCatalogItemInput,
    ctx: UseCaseContext
  ): Promise<Result<UpdateCatalogItemOutput, UseCaseError>> {
    const scope = scopeFromContext(ctx);
    const current = await this.depsRef.repo.findItemById(scope, input.itemId);
    if (!current) {
      throw new NotFoundError("Catalog item not found");
    }

    const nextCode = input.patch.code ? normalizeCatalogCode(input.patch.code) : current.code;
    if (nextCode !== current.code) {
      const existing = await this.depsRef.repo.findItemByCode(scope, nextCode);
      if (existing && existing.id !== current.id) {
        throw new ConflictError("Catalog item code already exists");
      }
    }

    const now = this.depsRef.clock.now().toISOString();
    const updated = {
      ...current,
      code: nextCode,
      name: input.patch.name ?? current.name,
      description:
        input.patch.description !== undefined
          ? (input.patch.description ?? null)
          : (current.description ?? null),
      status: input.patch.status ?? current.status,
      type: input.patch.type ?? current.type,
      defaultUomId: input.patch.defaultUomId ?? current.defaultUomId,
      taxProfileId:
        input.patch.taxProfileId !== undefined
          ? (input.patch.taxProfileId ?? null)
          : (current.taxProfileId ?? null),
      shelfLifeDays:
        input.patch.shelfLifeDays !== undefined
          ? (input.patch.shelfLifeDays ?? null)
          : (current.shelfLifeDays ?? null),
      requiresLotTracking: input.patch.requiresLotTracking ?? current.requiresLotTracking,
      requiresExpiryDate: input.patch.requiresExpiryDate ?? current.requiresExpiryDate,
      hsCode:
        input.patch.hsCode !== undefined ? (input.patch.hsCode ?? null) : (current.hsCode ?? null),
      metadata:
        input.patch.metadata !== undefined
          ? (input.patch.metadata ?? null)
          : (current.metadata ?? null),
      categoryIds: input.patch.categoryIds ?? current.categoryIds,
      updatedAt: now,
      archivedAt: current.archivedAt,
    };

    await this.depsRef.repo.updateItem(scope, updated);
    if (input.patch.categoryIds) {
      await this.depsRef.repo.replaceItemCategoryIds(scope, current.id, input.patch.categoryIds);
    }

    const item = await this.depsRef.repo.findItemById(scope, current.id);
    if (!item) {
      throw new NotFoundError("Catalog item not found");
    }

    await this.depsRef.audit.log({
      tenantId: scope.tenantId,
      userId: ctx.userId ?? "system",
      action: "catalog.item.updated",
      entityType: "CatalogItem",
      entityId: item.id,
      metadata: { workspaceId: scope.workspaceId },
    });

    await this.depsRef.outbox.enqueue({
      tenantId: scope.tenantId,
      eventType: "catalog.item.updated",
      payload: { itemId: item.id, workspaceId: scope.workspaceId },
      correlationId: ctx.correlationId,
    });

    return ok({ item });
  }
}
