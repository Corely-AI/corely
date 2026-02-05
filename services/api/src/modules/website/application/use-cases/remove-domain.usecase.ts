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
import type { WebsiteDomain } from "@corely/contracts";
import type { WebsiteDomainRepositoryPort } from "../ports/domain-repository.port";

type Deps = {
  logger: LoggerPort;
  domainRepo: WebsiteDomainRepositoryPort;
};

@RequireTenant()
export class RemoveWebsiteDomainUseCase extends BaseUseCase<
  { domainId: string; siteId: string },
  { removed: WebsiteDomain }
> {
  constructor(private readonly deps: Deps) {
    super({ logger: deps.logger });
  }

  protected async handle(
    input: { domainId: string; siteId: string },
    ctx: UseCaseContext
  ): Promise<Result<{ removed: WebsiteDomain }, UseCaseError>> {
    if (!ctx.tenantId) {
      return err(new ValidationError("tenantId is required", undefined, "Website:TenantRequired"));
    }

    const domain = await this.deps.domainRepo.findById(ctx.tenantId, input.domainId);
    if (!domain || domain.siteId !== input.siteId) {
      return err(new NotFoundError("Domain not found", undefined, "Website:DomainNotFound"));
    }

    await this.deps.domainRepo.delete(domain.id, ctx.tenantId);

    if (domain.isPrimary) {
      const remaining = await this.deps.domainRepo.listBySite(ctx.tenantId, input.siteId);
      if (remaining.length > 0) {
        const nextPrimary = { ...remaining[0], isPrimary: true };
        await this.deps.domainRepo.update(nextPrimary);
      }
    }

    return ok({ removed: domain });
  }
}
