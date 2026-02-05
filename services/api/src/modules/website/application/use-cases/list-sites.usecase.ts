import {
  BaseUseCase,
  type LoggerPort,
  type Result,
  type UseCaseContext,
  type UseCaseError,
  ValidationError,
  ok,
  err,
  RequireTenant,
} from "@corely/kernel";
import type { ListWebsiteSitesInput, ListWebsiteSitesOutput } from "@corely/contracts";
import { buildPageInfo } from "@/shared/http/pagination";
import type { WebsiteSiteRepositoryPort } from "../ports/site-repository.port";

type Deps = {
  logger: LoggerPort;
  siteRepo: WebsiteSiteRepositoryPort;
};

@RequireTenant()
export class ListWebsiteSitesUseCase extends BaseUseCase<
  ListWebsiteSitesInput,
  ListWebsiteSitesOutput
> {
  constructor(protected readonly deps: Deps) {
    super({ logger: deps.logger });
  }

  protected async handle(
    input: ListWebsiteSitesInput,
    ctx: UseCaseContext
  ): Promise<Result<ListWebsiteSitesOutput, UseCaseError>> {
    if (!ctx.tenantId) {
      return err(new ValidationError("tenantId is required", undefined, "Website:TenantRequired"));
    }

    const { items, total } = await this.deps.siteRepo.list(ctx.tenantId, {
      q: input.q,
      page: input.page ?? 1,
      pageSize: input.pageSize ?? 50,
    });

    return ok({
      items,
      pageInfo: buildPageInfo(total, input.page ?? 1, input.pageSize ?? 50),
    });
  }
}
