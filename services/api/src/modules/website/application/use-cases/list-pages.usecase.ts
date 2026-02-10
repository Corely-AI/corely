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
import type { ListWebsitePagesInput, ListWebsitePagesOutput } from "@corely/contracts";
import { buildPageInfo } from "@/shared/http/pagination";
import type { WebsitePageRepositoryPort } from "../ports/page-repository.port";

type Deps = {
  logger: LoggerPort;
  pageRepo: WebsitePageRepositoryPort;
};

@RequireTenant()
export class ListWebsitePagesUseCase extends BaseUseCase<
  ListWebsitePagesInput,
  ListWebsitePagesOutput
> {
  constructor(protected readonly deps: Deps) {
    super({ logger: deps.logger });
  }

  protected async handle(
    input: ListWebsitePagesInput,
    ctx: UseCaseContext
  ): Promise<Result<ListWebsitePagesOutput, UseCaseError>> {
    if (!ctx.tenantId) {
      return err(new ValidationError("tenantId is required", undefined, "Website:TenantRequired"));
    }
    if (!input.siteId) {
      return err(new ValidationError("siteId is required", undefined, "Website:InvalidSite"));
    }

    const { items, total } = await this.deps.pageRepo.list(ctx.tenantId, {
      siteId: input.siteId,
      status: input.status,
      q: input.q,
      page: input.page ?? 1,
      pageSize: input.pageSize ?? 50,
      sort: input.sort,
    });

    return ok({
      items,
      pageInfo: buildPageInfo(total, input.page ?? 1, input.pageSize ?? 50),
    });
  }
}
