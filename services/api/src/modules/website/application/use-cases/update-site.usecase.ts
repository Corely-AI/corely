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
import type { WebsiteCustomAttributesPort } from "../ports/custom-attributes.port";
import type { ClockPort } from "@shared/ports/clock.port";
import { normalizeLocale, normalizeWebsiteSlug } from "../../domain/website.validators";
import {
  normalizeWebsiteSiteCommonSettings,
  normalizeWebsiteSiteThemeSettings,
  parseWebsiteSiteCommonSettingsForWrite,
  parseWebsiteSiteCustomSettingsForWrite,
  parseWebsiteSiteThemeSettingsForWrite,
  WEBSITE_SITE_SETTINGS_ENTITY_TYPE,
} from "../../domain/site-settings";

type Deps = {
  logger: LoggerPort;
  siteRepo: WebsiteSiteRepositoryPort;
  customAttributes: WebsiteCustomAttributesPort;
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
    const nextName = input.input.name?.trim() ?? existing.name;
    const hasExplicitCommonPayload =
      input.input.common !== undefined || input.input.brandingJson !== undefined;
    const hasExplicitThemePayload =
      input.input.theme !== undefined || input.input.themeJson !== undefined;

    const commonSettings = hasExplicitCommonPayload
      ? parseWebsiteSiteCommonSettingsForWrite(
          input.input.common ?? input.input.brandingJson,
          nextName
        )
      : normalizeWebsiteSiteCommonSettings(existing.brandingJson, nextName);

    const themeSettings = hasExplicitThemePayload
      ? parseWebsiteSiteThemeSettingsForWrite(input.input.theme ?? input.input.themeJson)
      : normalizeWebsiteSiteThemeSettings(existing.themeJson);
    const updated: WebsiteSite = {
      ...existing,
      name: nextName,
      slug: nextSlug,
      defaultLocale: input.input.defaultLocale
        ? normalizeLocale(input.input.defaultLocale)
        : existing.defaultLocale,
      brandingJson: commonSettings,
      themeJson: themeSettings,
      isDefault: wantsDefault ? true : existing.isDefault,
      updatedAt: now,
    };

    const saved = await this.deps.siteRepo.update(updated);
    let finalSite = saved;

    if (wantsDefault) {
      await this.deps.siteRepo.setDefault(ctx.tenantId, saved.id);
      const refreshed = await this.deps.siteRepo.findById(ctx.tenantId, saved.id);
      finalSite = refreshed ?? { ...saved, isDefault: true };
    }

    if (input.input.custom !== undefined) {
      const nextCustom = parseWebsiteSiteCustomSettingsForWrite(input.input.custom);
      const existingCustom = await this.deps.customAttributes.getAttributes({
        tenantId: ctx.tenantId,
        entityType: WEBSITE_SITE_SETTINGS_ENTITY_TYPE,
        entityId: existing.id,
      });

      const nextKeys = new Set(Object.keys(nextCustom));
      const keysToDelete = Object.keys(existingCustom).filter((key) => !nextKeys.has(key));

      if (keysToDelete.length > 0) {
        await this.deps.customAttributes.deleteAttributes({
          tenantId: ctx.tenantId,
          entityType: WEBSITE_SITE_SETTINGS_ENTITY_TYPE,
          entityId: existing.id,
          keys: keysToDelete,
        });
      }

      if (Object.keys(nextCustom).length > 0) {
        await this.deps.customAttributes.upsertAttributes({
          tenantId: ctx.tenantId,
          entityType: WEBSITE_SITE_SETTINGS_ENTITY_TYPE,
          entityId: existing.id,
          attributes: nextCustom,
        });
      }
    }

    return ok(finalSite);
  }
}
