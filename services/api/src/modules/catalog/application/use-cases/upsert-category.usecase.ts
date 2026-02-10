import {
  BaseUseCase,
  ConflictError,
  RequireTenant,
  type Result,
  type UseCaseContext,
  type UseCaseError,
  ok,
} from "@corely/kernel";
import type { UpsertCatalogCategoryInput, UpsertCatalogCategoryOutput } from "@corely/contracts";
import { scopeFromContext, type CatalogUseCaseDeps } from "./catalog.deps";

@RequireTenant()
export class UpsertCatalogCategoryUseCase extends BaseUseCase<
  UpsertCatalogCategoryInput,
  UpsertCatalogCategoryOutput
> {
  constructor(private readonly depsRef: CatalogUseCaseDeps) {
    super({ logger: depsRef.logger });
  }

  protected async handle(
    input: UpsertCatalogCategoryInput,
    ctx: UseCaseContext
  ): Promise<Result<UpsertCatalogCategoryOutput, UseCaseError>> {
    const scope = scopeFromContext(ctx);
    const existing = await this.depsRef.repo.findCategoryByName(scope, input.name);
    if (existing && existing.id !== input.categoryId) {
      throw new ConflictError("Catalog category name already exists");
    }
    const now = this.depsRef.clock.now().toISOString();
    const category = {
      id: input.categoryId ?? existing?.id ?? this.depsRef.idGenerator.newId(),
      tenantId: scope.tenantId,
      workspaceId: scope.workspaceId,
      name: input.name,
      parentId: input.parentId ?? null,
      createdAt: existing?.createdAt ?? now,
      updatedAt: now,
      archivedAt: existing?.archivedAt ?? null,
    };
    await this.depsRef.repo.upsertCategory(scope, category);
    return ok({ category });
  }
}
