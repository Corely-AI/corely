import {
  BaseUseCase,
  RequireTenant,
  type Result,
  type UseCaseContext,
  type UseCaseError,
  ok,
} from "@corely/kernel";
import type { UpsertCatalogPriceInput, UpsertCatalogPriceOutput } from "@corely/contracts";
import { scopeFromContext, type CatalogUseCaseDeps } from "./catalog.deps";

@RequireTenant()
export class UpsertCatalogPriceUseCase extends BaseUseCase<
  UpsertCatalogPriceInput,
  UpsertCatalogPriceOutput
> {
  constructor(private readonly depsRef: CatalogUseCaseDeps) {
    super({ logger: depsRef.logger });
  }

  protected async handle(
    input: UpsertCatalogPriceInput,
    ctx: UseCaseContext
  ): Promise<Result<UpsertCatalogPriceOutput, UseCaseError>> {
    const scope = scopeFromContext(ctx);
    const now = this.depsRef.clock.now().toISOString();
    const price = {
      id: input.priceId ?? this.depsRef.idGenerator.newId(),
      tenantId: scope.tenantId,
      workspaceId: scope.workspaceId,
      priceListId: input.priceListId,
      itemId: input.itemId ?? null,
      variantId: input.variantId ?? null,
      amount: input.amount,
      taxIncluded: input.taxIncluded,
      effectiveFrom: input.effectiveFrom ?? null,
      effectiveTo: input.effectiveTo ?? null,
      createdAt: now,
      updatedAt: now,
    };

    await this.depsRef.repo.upsertPrice(scope, price);
    return ok({ price });
  }
}
