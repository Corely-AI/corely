import {
  BaseUseCase,
  RequireTenant,
  type Result,
  type UseCaseContext,
  type UseCaseError,
  ok,
} from "@corely/kernel";
import type { ListCatalogUomsInput, ListCatalogUomsOutput } from "@corely/contracts";
import { buildPageInfo } from "../../../../shared/http/pagination";
import { scopeFromContext, type CatalogUseCaseDeps } from "./catalog.deps";

@RequireTenant()
export class ListCatalogUomsUseCase extends BaseUseCase<
  ListCatalogUomsInput,
  ListCatalogUomsOutput
> {
  constructor(private readonly depsRef: CatalogUseCaseDeps) {
    super({ logger: depsRef.logger });
  }

  protected async handle(
    input: ListCatalogUomsInput,
    ctx: UseCaseContext
  ): Promise<Result<ListCatalogUomsOutput, UseCaseError>> {
    const scope = scopeFromContext(ctx);
    const result = await this.depsRef.repo.listUoms(scope, {
      q: input.q,
      page: input.page,
      pageSize: input.pageSize,
    });
    return ok({
      items: result.items,
      pageInfo: buildPageInfo(result.total, input.page, input.pageSize),
    });
  }
}
