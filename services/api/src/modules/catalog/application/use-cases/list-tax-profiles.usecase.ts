import {
  BaseUseCase,
  RequireTenant,
  type Result,
  type UseCaseContext,
  type UseCaseError,
  ok,
} from "@corely/kernel";
import type { ListCatalogTaxProfilesInput, ListCatalogTaxProfilesOutput } from "@corely/contracts";
import { buildPageInfo } from "../../../../shared/http/pagination";
import { scopeFromContext, type CatalogUseCaseDeps } from "./catalog.deps";

@RequireTenant()
export class ListCatalogTaxProfilesUseCase extends BaseUseCase<
  ListCatalogTaxProfilesInput,
  ListCatalogTaxProfilesOutput
> {
  constructor(private readonly depsRef: CatalogUseCaseDeps) {
    super({ logger: depsRef.logger });
  }

  protected async handle(
    input: ListCatalogTaxProfilesInput,
    ctx: UseCaseContext
  ): Promise<Result<ListCatalogTaxProfilesOutput, UseCaseError>> {
    const scope = scopeFromContext(ctx);
    const result = await this.depsRef.repo.listTaxProfiles(scope, {
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
