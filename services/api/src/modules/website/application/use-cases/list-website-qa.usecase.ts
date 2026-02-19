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
import type { ListWebsiteQaAdminInput, ListWebsiteQaAdminOutput } from "@corely/contracts";
import type { WebsiteSiteRepositoryPort } from "../ports/site-repository.port";
import type { WebsiteQaRepositoryPort } from "../ports/qa-repository.port";

type Deps = {
  logger: LoggerPort;
  siteRepo: WebsiteSiteRepositoryPort;
  qaRepo: WebsiteQaRepositoryPort;
};

@RequireTenant()
export class ListWebsiteQaUseCase extends BaseUseCase<
  ListWebsiteQaAdminInput,
  ListWebsiteQaAdminOutput
> {
  constructor(protected readonly deps: Deps) {
    super({ logger: deps.logger });
  }

  protected async handle(
    input: ListWebsiteQaAdminInput,
    ctx: UseCaseContext
  ): Promise<Result<ListWebsiteQaAdminOutput, UseCaseError>> {
    if (!ctx.tenantId) {
      return err(new ValidationError("tenantId is required", undefined, "Website:TenantRequired"));
    }

    const site = await this.deps.siteRepo.findById(ctx.tenantId, input.siteId);
    if (!site) {
      return err(new ValidationError("site not found", undefined, "Website:SiteNotFound"));
    }

    const items = await this.deps.qaRepo.listForSite({
      tenantId: ctx.tenantId,
      siteId: input.siteId,
      locale: input.locale,
      scope: input.scope,
      pageId: input.pageId,
      status: input.status,
    });

    return ok({ items });
  }
}
