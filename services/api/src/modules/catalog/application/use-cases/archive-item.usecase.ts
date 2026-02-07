import {
  BaseUseCase,
  NotFoundError,
  RequireTenant,
  type Result,
  type UseCaseContext,
  type UseCaseError,
  ok,
} from "@corely/kernel";
import type { ArchiveCatalogItemInput, ArchiveCatalogItemOutput } from "@corely/contracts";
import { assertCanArchiveItem } from "../../domain/catalog-item.policy";
import { scopeFromContext, type CatalogUseCaseDeps } from "./catalog.deps";

@RequireTenant()
export class ArchiveCatalogItemUseCase extends BaseUseCase<
  ArchiveCatalogItemInput,
  ArchiveCatalogItemOutput
> {
  constructor(private readonly depsRef: CatalogUseCaseDeps) {
    super({ logger: depsRef.logger });
  }

  protected async handle(
    input: ArchiveCatalogItemInput,
    ctx: UseCaseContext
  ): Promise<Result<ArchiveCatalogItemOutput, UseCaseError>> {
    const scope = scopeFromContext(ctx);
    const current = await this.depsRef.repo.findItemById(scope, input.itemId);
    if (!current) {
      throw new NotFoundError("Catalog item not found");
    }

    const activeVariantCount = await this.depsRef.repo.countActiveVariants(scope, input.itemId);
    assertCanArchiveItem(activeVariantCount);

    const archivedAt = this.depsRef.clock.now().toISOString();
    await this.depsRef.repo.updateItem(scope, {
      ...current,
      status: "ARCHIVED",
      archivedAt,
      updatedAt: archivedAt,
    });

    const item = await this.depsRef.repo.findItemById(scope, input.itemId);
    if (!item) {
      throw new NotFoundError("Catalog item not found");
    }

    await this.depsRef.audit.log({
      tenantId: scope.tenantId,
      userId: ctx.userId ?? "system",
      action: "catalog.item.archived",
      entityType: "CatalogItem",
      entityId: item.id,
      metadata: { workspaceId: scope.workspaceId },
    });

    await this.depsRef.outbox.enqueue({
      tenantId: scope.tenantId,
      eventType: "catalog.item.archived",
      payload: { itemId: item.id, workspaceId: scope.workspaceId },
      correlationId: ctx.correlationId,
    });

    return ok({ item });
  }
}
