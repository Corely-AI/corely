import {
  BaseUseCase,
  RequireTenant,
  type Result,
  type UseCaseContext,
  type UseCaseError,
  ok,
} from "@corely/kernel";
import type { ListCatalogPriceListsInput, ListCatalogPriceListsOutput } from "@corely/contracts";
import { buildPageInfo } from "../../../../shared/http/pagination";
import { scopeFromContext, type CatalogUseCaseDeps } from "./catalog.deps";

@RequireTenant()
export class ListCatalogPriceListsUseCase extends BaseUseCase<
  ListCatalogPriceListsInput,
  ListCatalogPriceListsOutput
> {
  constructor(private readonly depsRef: CatalogUseCaseDeps) {
    super({ logger: depsRef.logger });
  }

  protected async handle(
    input: ListCatalogPriceListsInput,
    ctx: UseCaseContext
  ): Promise<Result<ListCatalogPriceListsOutput, UseCaseError>> {
    const scope = scopeFromContext(ctx);
    const result = await this.depsRef.repo.listPriceLists(scope, {
      q: input.q,
      page: input.page,
      pageSize: input.pageSize,
      status: input.status,
    });
    return ok({
      items: result.items,
      pageInfo: buildPageInfo(result.total, input.page, input.pageSize),
    });
  }
}
