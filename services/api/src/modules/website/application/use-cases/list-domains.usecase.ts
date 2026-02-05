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
import type { ListWebsiteDomainsOutput } from "@corely/contracts";
import type { WebsiteDomainRepositoryPort } from "../ports/domain-repository.port";

type Deps = {
  logger: LoggerPort;
  domainRepo: WebsiteDomainRepositoryPort;
};

@RequireTenant()
export class ListWebsiteDomainsUseCase extends BaseUseCase<
  { siteId: string },
  ListWebsiteDomainsOutput
> {
  constructor(protected readonly deps: Deps) {
    super({ logger: deps.logger });
  }

  protected async handle(
    input: { siteId: string },
    ctx: UseCaseContext
  ): Promise<Result<ListWebsiteDomainsOutput, UseCaseError>> {
    if (!ctx.tenantId) {
      return err(new ValidationError("tenantId is required", undefined, "Website:TenantRequired"));
    }

    const items = await this.deps.domainRepo.listBySite(ctx.tenantId, input.siteId);
    return ok({ items });
  }
}
