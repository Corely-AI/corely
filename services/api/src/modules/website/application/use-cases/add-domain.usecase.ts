import {
  BaseUseCase,
  type LoggerPort,
  type Result,
  type UseCaseContext,
  type UseCaseError,
  ConflictError,
  ValidationError,
  NotFoundError,
  ok,
  err,
  RequireTenant,
} from "@corely/kernel";
import type { AddWebsiteDomainInput, WebsiteDomain } from "@corely/contracts";
import type { WebsiteDomainRepositoryPort } from "../ports/domain-repository.port";
import type { WebsiteSiteRepositoryPort } from "../ports/site-repository.port";
import type { IdGeneratorPort } from "@shared/ports/id-generator.port";
import type { ClockPort } from "@shared/ports/clock.port";
import { normalizeHostname } from "../../domain/website.validators";

type Deps = {
  logger: LoggerPort;
  domainRepo: WebsiteDomainRepositoryPort;
  siteRepo: WebsiteSiteRepositoryPort;
  idGenerator: IdGeneratorPort;
  clock: ClockPort;
};

@RequireTenant()
export class AddWebsiteDomainUseCase extends BaseUseCase<
  { siteId: string; input: AddWebsiteDomainInput },
  WebsiteDomain
> {
  constructor(protected readonly deps: Deps) {
    super({ logger: deps.logger });
  }

  protected async handle(
    input: { siteId: string; input: AddWebsiteDomainInput },
    ctx: UseCaseContext
  ): Promise<Result<WebsiteDomain, UseCaseError>> {
    if (!ctx.tenantId) {
      return err(new ValidationError("tenantId is required", undefined, "Website:TenantRequired"));
    }

    const site = await this.deps.siteRepo.findById(ctx.tenantId, input.siteId);
    if (!site) {
      return err(new NotFoundError("Site not found", undefined, "Website:SiteNotFound"));
    }

    const hostname = normalizeHostname(input.input.hostname);
    const existing = await this.deps.domainRepo.findByHostname(ctx.tenantId, hostname);
    if (existing) {
      return err(new ConflictError("Domain already exists", undefined, "Website:DomainExists"));
    }

    const domains = await this.deps.domainRepo.listBySite(ctx.tenantId, input.siteId);
    const shouldBePrimary = input.input.isPrimary ?? domains.length === 0;

    const now = this.deps.clock.now().toISOString();
    const domain: WebsiteDomain = {
      id: this.deps.idGenerator.newId(),
      tenantId: ctx.tenantId,
      siteId: input.siteId,
      hostname,
      isPrimary: shouldBePrimary,
      createdAt: now,
      updatedAt: now,
    };

    if (shouldBePrimary) {
      await this.deps.domainRepo.clearPrimaryForSite(ctx.tenantId, input.siteId);
    }

    const created = await this.deps.domainRepo.create(domain);
    return ok(created);
  }
}
