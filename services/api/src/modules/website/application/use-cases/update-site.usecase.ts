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
import type { UpdateWebsiteSiteInput, WebsiteSite } from "@corely/contracts";
import type { WebsiteSiteRepositoryPort } from "../ports/site-repository.port";
import type { ClockPort } from "@shared/ports/clock.port";
import { normalizeLocale } from "../../domain/website.validators";

type Deps = {
  logger: LoggerPort;
  siteRepo: WebsiteSiteRepositoryPort;
  clock: ClockPort;
};

@RequireTenant()
export class UpdateWebsiteSiteUseCase extends BaseUseCase<
  { siteId: string; input: UpdateWebsiteSiteInput },
  WebsiteSite
> {
  constructor(private readonly deps: Deps) {
    super({ logger: deps.logger });
  }

  protected async handle(
    input: { siteId: string; input: UpdateWebsiteSiteInput },
    ctx: UseCaseContext
  ): Promise<Result<WebsiteSite, UseCaseError>> {
    if (!ctx.tenantId) {
      return err(new ValidationError("tenantId is required", undefined, "Website:TenantRequired"));
    }

    const existing = await this.deps.siteRepo.findById(ctx.tenantId, input.siteId);
    if (!existing) {
      return err(new NotFoundError("Site not found", undefined, "Website:SiteNotFound"));
    }

    const now = this.deps.clock.now().toISOString();
    const updated: WebsiteSite = {
      ...existing,
      name: input.input.name?.trim() ?? existing.name,
      defaultLocale: input.input.defaultLocale
        ? normalizeLocale(input.input.defaultLocale)
        : existing.defaultLocale,
      brandingJson:
        input.input.brandingJson === undefined ? existing.brandingJson : input.input.brandingJson,
      themeJson: input.input.themeJson === undefined ? existing.themeJson : input.input.themeJson,
      updatedAt: now,
    };

    const saved = await this.deps.siteRepo.update(updated);
    return ok(saved);
  }
}
