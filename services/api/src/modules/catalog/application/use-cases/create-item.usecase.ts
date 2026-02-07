import {
  BaseUseCase,
  ConflictError,
  RequireTenant,
  type Result,
  type UseCaseContext,
  type UseCaseError,
  ok,
} from "@corely/kernel";
import type { CreateCatalogItemInput, CreateCatalogItemOutput } from "@corely/contracts";
import { normalizeCatalogCode } from "../../domain/catalog-normalization";
import { scopeFromContext, type CatalogUseCaseDeps } from "./catalog.deps";

@RequireTenant()
export class CreateCatalogItemUseCase extends BaseUseCase<
  CreateCatalogItemInput,
  CreateCatalogItemOutput
> {
  constructor(private readonly depsRef: CatalogUseCaseDeps) {
    super({ logger: depsRef.logger });
  }

  protected async handle(
    input: CreateCatalogItemInput,
    ctx: UseCaseContext
  ): Promise<Result<CreateCatalogItemOutput, UseCaseError>> {
    const scope = scopeFromContext(ctx);
    const actionKey = "catalog.create-item";
    if (input.idempotencyKey) {
      const cached = await this.depsRef.idempotency.get(
        actionKey,
        scope.tenantId,
        input.idempotencyKey
      );
      if (cached?.body?.item) {
        return ok(cached.body as CreateCatalogItemOutput);
      }
    }

    const code = normalizeCatalogCode(input.code);
    const existing = await this.depsRef.repo.findItemByCode(scope, code);
    if (existing) {
      throw new ConflictError("Catalog item code already exists");
    }

    const now = this.depsRef.clock.now();
    const itemId = this.depsRef.idGenerator.newId();

    await this.depsRef.repo.createItem(scope, {
      id: itemId,
      tenantId: scope.tenantId,
      workspaceId: scope.workspaceId,
      code,
      name: input.name,
      description: input.description ?? null,
      status: "ACTIVE",
      type: input.type,
      defaultUomId: input.defaultUomId,
      taxProfileId: input.taxProfileId ?? null,
      shelfLifeDays: input.shelfLifeDays ?? null,
      requiresLotTracking: input.requiresLotTracking ?? false,
      requiresExpiryDate: input.requiresExpiryDate ?? false,
      hsCode: input.hsCode ?? null,
      metadata: input.metadata ?? null,
      categoryIds: input.categoryIds ?? [],
      createdAt: now.toISOString(),
      updatedAt: now.toISOString(),
      archivedAt: null,
    });

    await this.depsRef.repo.replaceItemCategoryIds(scope, itemId, input.categoryIds ?? []);

    const item = await this.depsRef.repo.findItemById(scope, itemId);
    if (!item) {
      throw new ConflictError("Failed to load created item");
    }

    await this.depsRef.audit.log({
      tenantId: scope.tenantId,
      userId: ctx.userId ?? "system",
      action: "catalog.item.created",
      entityType: "CatalogItem",
      entityId: item.id,
      metadata: { workspaceId: scope.workspaceId },
    });

    await this.depsRef.outbox.enqueue({
      tenantId: scope.tenantId,
      eventType: "catalog.item.created",
      payload: { itemId: item.id, workspaceId: scope.workspaceId, code: item.code },
      correlationId: ctx.correlationId,
    });

    const output = { item };
    if (input.idempotencyKey) {
      await this.depsRef.idempotency.store(actionKey, scope.tenantId, input.idempotencyKey, {
        body: output,
      });
    }

    return ok(output);
  }
}
