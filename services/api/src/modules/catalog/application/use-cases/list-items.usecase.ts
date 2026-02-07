import {
  BaseUseCase,
  RequireTenant,
  type Result,
  type UseCaseContext,
  type UseCaseError,
  ok,
} from "@corely/kernel";
import type { ListCatalogItemsInput, ListCatalogItemsOutput } from "@corely/contracts";
import { buildPageInfo } from "../../../../shared/http/pagination";
import { scopeFromContext, type CatalogUseCaseDeps } from "./catalog.deps";

@RequireTenant()
export class ListCatalogItemsUseCase extends BaseUseCase<
  ListCatalogItemsInput,
  ListCatalogItemsOutput
> {
  constructor(private readonly depsRef: CatalogUseCaseDeps) {
    super({ logger: depsRef.logger });
  }

  protected async handle(
    input: ListCatalogItemsInput,
    ctx: UseCaseContext
  ): Promise<Result<ListCatalogItemsOutput, UseCaseError>> {
    const scope = scopeFromContext(ctx);
    const result = await this.depsRef.repo.listItems(scope, {
      q: input.q,
      page: input.page,
      pageSize: input.pageSize,
      sort: typeof input.sort === "string" ? input.sort : undefined,
      filters: input.filters,
      status: input.status,
      type: input.type,
    });
    return ok({
      items: result.items,
      pageInfo: buildPageInfo(result.total, input.page, input.pageSize),
    });
  }
}
