import {
  BaseUseCase,
  NotFoundError,
  RequireTenant,
  type Result,
  type UseCaseContext,
  type UseCaseError,
  ok,
} from "@corely/kernel";
import type { ArchiveCatalogVariantInput, ArchiveCatalogVariantOutput } from "@corely/contracts";
import { scopeFromContext, type CatalogUseCaseDeps } from "./catalog.deps";

@RequireTenant()
export class ArchiveCatalogVariantUseCase extends BaseUseCase<
  ArchiveCatalogVariantInput,
  ArchiveCatalogVariantOutput
> {
  constructor(private readonly depsRef: CatalogUseCaseDeps) {
    super({ logger: depsRef.logger });
  }

  protected async handle(
    input: ArchiveCatalogVariantInput,
    ctx: UseCaseContext
  ): Promise<Result<ArchiveCatalogVariantOutput, UseCaseError>> {
    const scope = scopeFromContext(ctx);
    const current = await this.depsRef.repo.findVariantById(scope, input.variantId);
    if (!current) {
      throw new NotFoundError("Catalog variant not found");
    }

    await this.depsRef.repo.upsertVariant(scope, {
      ...current,
      status: "ARCHIVED",
      updatedAt: this.depsRef.clock.now().toISOString(),
      archivedAt: this.depsRef.clock.now().toISOString(),
    });

    const variant = await this.depsRef.repo.findVariantById(scope, input.variantId);
    if (!variant) {
      throw new NotFoundError("Catalog variant not found");
    }

    await this.depsRef.audit.log({
      tenantId: scope.tenantId,
      userId: ctx.userId ?? "system",
      action: "catalog.variant.archived",
      entityType: "CatalogVariant",
      entityId: variant.id,
      metadata: { workspaceId: scope.workspaceId },
    });

    await this.depsRef.outbox.enqueue({
      tenantId: scope.tenantId,
      eventType: "catalog.variant.archived",
      payload: { variantId: variant.id, itemId: variant.itemId, workspaceId: scope.workspaceId },
      correlationId: ctx.correlationId,
    });

    return ok({ variant });
  }
}
