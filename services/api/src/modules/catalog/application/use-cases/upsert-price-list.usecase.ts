import {
  BaseUseCase,
  ConflictError,
  RequireTenant,
  type Result,
  type UseCaseContext,
  type UseCaseError,
  ok,
} from "@corely/kernel";
import type { UpsertCatalogPriceListInput, UpsertCatalogPriceListOutput } from "@corely/contracts";
import { scopeFromContext, type CatalogUseCaseDeps } from "./catalog.deps";

@RequireTenant()
export class UpsertCatalogPriceListUseCase extends BaseUseCase<
  UpsertCatalogPriceListInput,
  UpsertCatalogPriceListOutput
> {
  constructor(private readonly depsRef: CatalogUseCaseDeps) {
    super({ logger: depsRef.logger });
  }

  protected async handle(
    input: UpsertCatalogPriceListInput,
    ctx: UseCaseContext
  ): Promise<Result<UpsertCatalogPriceListOutput, UseCaseError>> {
    const scope = scopeFromContext(ctx);
    const existing = await this.depsRef.repo.findPriceListByName(scope, input.name);
    if (existing && existing.id !== input.priceListId) {
      throw new ConflictError("Catalog price list name already exists");
    }
    const now = this.depsRef.clock.now().toISOString();
    const priceList = {
      id: input.priceListId ?? existing?.id ?? this.depsRef.idGenerator.newId(),
      tenantId: scope.tenantId,
      workspaceId: scope.workspaceId,
      name: input.name,
      currency: input.currency.toUpperCase(),
      status: input.status ?? existing?.status ?? "ACTIVE",
      createdAt: existing?.createdAt ?? now,
      updatedAt: now,
      archivedAt: existing?.archivedAt ?? null,
    };
    await this.depsRef.repo.upsertPriceList(scope, priceList);
    return ok({ priceList });
  }
}
