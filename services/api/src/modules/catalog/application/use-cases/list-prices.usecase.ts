import {
  BaseUseCase,
  RequireTenant,
  type Result,
  type UseCaseContext,
  type UseCaseError,
  ok,
} from "@corely/kernel";
import type { ListCatalogPricesInput, ListCatalogPricesOutput } from "@corely/contracts";
import { buildPageInfo } from "../../../../shared/http/pagination";
import { scopeFromContext, type CatalogUseCaseDeps } from "./catalog.deps";

@RequireTenant()
export class ListCatalogPricesUseCase extends BaseUseCase<
  ListCatalogPricesInput,
  ListCatalogPricesOutput
> {
  constructor(private readonly depsRef: CatalogUseCaseDeps) {
    super({ logger: depsRef.logger });
  }

  protected async handle(
    input: ListCatalogPricesInput,
    ctx: UseCaseContext
  ): Promise<Result<ListCatalogPricesOutput, UseCaseError>> {
    const scope = scopeFromContext(ctx);
    const result = await this.depsRef.repo.listPrices(scope, {
      q: input.q,
      page: input.page,
      pageSize: input.pageSize,
      priceListId: input.priceListId,
      itemId: input.itemId,
      variantId: input.variantId,
    });
    return ok({
      items: result.items,
      pageInfo: buildPageInfo(result.total, input.page, input.pageSize),
    });
  }
}
