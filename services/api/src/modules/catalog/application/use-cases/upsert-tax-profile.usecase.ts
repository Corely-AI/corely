import {
  BaseUseCase,
  ConflictError,
  RequireTenant,
  type Result,
  type UseCaseContext,
  type UseCaseError,
  ok,
} from "@corely/kernel";
import type {
  UpsertCatalogTaxProfileInput,
  UpsertCatalogTaxProfileOutput,
} from "@corely/contracts";
import { scopeFromContext, type CatalogUseCaseDeps } from "./catalog.deps";

@RequireTenant()
export class UpsertCatalogTaxProfileUseCase extends BaseUseCase<
  UpsertCatalogTaxProfileInput,
  UpsertCatalogTaxProfileOutput
> {
  constructor(private readonly depsRef: CatalogUseCaseDeps) {
    super({ logger: depsRef.logger });
  }

  protected async handle(
    input: UpsertCatalogTaxProfileInput,
    ctx: UseCaseContext
  ): Promise<Result<UpsertCatalogTaxProfileOutput, UseCaseError>> {
    const scope = scopeFromContext(ctx);
    const existing = await this.depsRef.repo.findTaxProfileByName(scope, input.name);
    if (existing && existing.id !== input.taxProfileId) {
      throw new ConflictError("Catalog tax profile name already exists");
    }
    const now = this.depsRef.clock.now().toISOString();
    const taxProfile = {
      id: input.taxProfileId ?? existing?.id ?? this.depsRef.idGenerator.newId(),
      tenantId: scope.tenantId,
      workspaceId: scope.workspaceId,
      name: input.name,
      vatRateBps: input.vatRateBps,
      isExciseApplicable: input.isExciseApplicable,
      exciseType: input.exciseType ?? null,
      exciseValue: input.exciseValue ?? null,
      effectiveFrom: input.effectiveFrom ?? null,
      effectiveTo: input.effectiveTo ?? null,
      createdAt: existing?.createdAt ?? now,
      updatedAt: now,
      archivedAt: existing?.archivedAt ?? null,
    };
    await this.depsRef.repo.upsertTaxProfile(scope, taxProfile);

    await this.depsRef.outbox.enqueue({
      tenantId: scope.tenantId,
      eventType: "catalog.tax-profile.changed",
      payload: { taxProfileId: taxProfile.id, workspaceId: scope.workspaceId },
      correlationId: ctx.correlationId,
    });

    return ok({ taxProfile });
  }
}
