import {
  BaseUseCase,
  RequireTenant,
  type Result,
  type UseCaseContext,
  type UseCaseError,
  ok,
} from "@corely/kernel";
import type { ListCatalogCategoriesInput, ListCatalogCategoriesOutput } from "@corely/contracts";
import { buildPageInfo } from "../../../../shared/http/pagination";
import { scopeFromContext, type CatalogUseCaseDeps } from "./catalog.deps";

@RequireTenant()
export class ListCatalogCategoriesUseCase extends BaseUseCase<
  ListCatalogCategoriesInput,
  ListCatalogCategoriesOutput
> {
  constructor(private readonly depsRef: CatalogUseCaseDeps) {
    super({ logger: depsRef.logger });
  }

  protected async handle(
    input: ListCatalogCategoriesInput,
    ctx: UseCaseContext
  ): Promise<Result<ListCatalogCategoriesOutput, UseCaseError>> {
    const scope = scopeFromContext(ctx);
    const result = await this.depsRef.repo.listCategories(scope, {
      q: input.q,
      page: input.page,
      pageSize: input.pageSize,
      parentId: input.parentId,
    });
    return ok({
      items: result.items,
      pageInfo: buildPageInfo(result.total, input.page, input.pageSize),
    });
  }
}
