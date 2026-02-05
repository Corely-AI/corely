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
import { normalizeLocale, normalizeWebsiteSlug } from "../../domain/website.validators";

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
  constructor(protected readonly deps: Deps) {
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

    if (input.input.isDefault === false && existing.isDefault) {
      return err(
        new ValidationError(
          "Default website cannot be unset. Select another site as default instead.",
          undefined,
          "Website:DefaultRequired"
        )
      );
    }

    let nextSlug = existing.slug;
    if (input.input.slug) {
      nextSlug = normalizeWebsiteSlug(input.input.slug);
      if (nextSlug !== existing.slug) {
        const slugMatch = await this.deps.siteRepo.findBySlug(ctx.tenantId, nextSlug);
        if (slugMatch && slugMatch.id !== existing.id) {
          return err(new ValidationError("slug is already in use", undefined, "Website:SlugTaken"));
        }
      }
    }

    const wantsDefault = input.input.isDefault === true;
    const now = this.deps.clock.now().toISOString();
    const updated: WebsiteSite = {
      ...existing,
      name: input.input.name?.trim() ?? existing.name,
      slug: nextSlug,
      defaultLocale: input.input.defaultLocale
        ? normalizeLocale(input.input.defaultLocale)
        : existing.defaultLocale,
      brandingJson:
        input.input.brandingJson === undefined ? existing.brandingJson : input.input.brandingJson,
      themeJson: input.input.themeJson === undefined ? existing.themeJson : input.input.themeJson,
      isDefault: wantsDefault ? true : existing.isDefault,
      updatedAt: now,
    };

    const saved = await this.deps.siteRepo.update(updated);
    if (wantsDefault) {
      await this.deps.siteRepo.setDefault(ctx.tenantId, saved.id);
      const refreshed = await this.deps.siteRepo.findById(ctx.tenantId, saved.id);
      return ok(refreshed ?? { ...saved, isDefault: true });
    }
    return ok(saved);
  }
}
