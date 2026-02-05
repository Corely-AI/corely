import {
  BaseUseCase,
  type LoggerPort,
  type Result,
  type UseCaseContext,
  type UseCaseError,
  NotFoundError,
  ValidationError,
  ok,
  err,
  RequireTenant,
} from "@corely/kernel";
import type { GetWebsiteSiteOutput } from "@corely/contracts";
import type { WebsiteSiteRepositoryPort } from "../ports/site-repository.port";

type Deps = {
  logger: LoggerPort;
  siteRepo: WebsiteSiteRepositoryPort;
};

@RequireTenant()
export class GetWebsiteSiteUseCase extends BaseUseCase<{ siteId: string }, GetWebsiteSiteOutput> {
  constructor(private readonly deps: Deps) {
    super({ logger: deps.logger });
  }

  protected async handle(
    input: { siteId: string },
    ctx: UseCaseContext
  ): Promise<Result<GetWebsiteSiteOutput, UseCaseError>> {
    if (!ctx.tenantId) {
      return err(new ValidationError("tenantId is required", undefined, "Website:TenantRequired"));
    }

    const site = await this.deps.siteRepo.findById(ctx.tenantId, input.siteId);
    if (!site) {
      return err(new NotFoundError("Site not found", undefined, "Website:SiteNotFound"));
    }

    return ok({ site });
  }
}
