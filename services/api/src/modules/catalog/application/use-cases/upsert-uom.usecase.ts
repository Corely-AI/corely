import {
  BaseUseCase,
  ConflictError,
  RequireTenant,
  type Result,
  type UseCaseContext,
  type UseCaseError,
  ok,
} from "@corely/kernel";
import type { UpsertCatalogUomInput, UpsertCatalogUomOutput } from "@corely/contracts";
import { scopeFromContext, type CatalogUseCaseDeps } from "./catalog.deps";

@RequireTenant()
export class UpsertCatalogUomUseCase extends BaseUseCase<
  UpsertCatalogUomInput,
  UpsertCatalogUomOutput
> {
  constructor(private readonly depsRef: CatalogUseCaseDeps) {
    super({ logger: depsRef.logger });
  }

  protected async handle(
    input: UpsertCatalogUomInput,
    ctx: UseCaseContext
  ): Promise<Result<UpsertCatalogUomOutput, UseCaseError>> {
    const scope = scopeFromContext(ctx);
    const code = input.code.trim().toUpperCase();
    const existing = await this.depsRef.repo.findUomByCode(scope, code);
    if (existing && existing.id !== input.uomId) {
      throw new ConflictError("Catalog UOM code already exists");
    }

    const now = this.depsRef.clock.now().toISOString();
    const uom = {
      id: input.uomId ?? existing?.id ?? this.depsRef.idGenerator.newId(),
      tenantId: scope.tenantId,
      workspaceId: scope.workspaceId,
      code,
      name: input.name,
      baseCode: input.baseCode ?? null,
      factor: input.factor ?? null,
      rounding: input.rounding ?? null,
      createdAt: existing?.createdAt ?? now,
      updatedAt: now,
    };

    await this.depsRef.repo.upsertUom(scope, uom);
    return ok({ uom });
  }
}
