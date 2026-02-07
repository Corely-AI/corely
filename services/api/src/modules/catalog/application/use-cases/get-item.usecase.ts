import {
  BaseUseCase,
  NotFoundError,
  RequireTenant,
  type Result,
  type UseCaseContext,
  type UseCaseError,
  ok,
} from "@corely/kernel";
import type { GetCatalogItemInput, GetCatalogItemOutput } from "@corely/contracts";
import { scopeFromContext, type CatalogUseCaseDeps } from "./catalog.deps";

@RequireTenant()
export class GetCatalogItemUseCase extends BaseUseCase<GetCatalogItemInput, GetCatalogItemOutput> {
  constructor(private readonly depsRef: CatalogUseCaseDeps) {
    super({ logger: depsRef.logger });
  }

  protected async handle(
    input: GetCatalogItemInput,
    ctx: UseCaseContext
  ): Promise<Result<GetCatalogItemOutput, UseCaseError>> {
    const scope = scopeFromContext(ctx);
    const item = await this.depsRef.repo.findItemById(scope, input.itemId);
    if (!item) {
      throw new NotFoundError("Catalog item not found");
    }
    return ok({ item });
  }
}
