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
} from "@corely/kernel";
import type {
  ResolveWebsitePublicSiteSettingsInput,
  ResolveWebsitePublicSiteSettingsOutput,
} from "@corely/contracts";
import type { WebsiteSiteRepositoryPort } from "../ports/site-repository.port";
import type { WebsiteCustomAttributesPort } from "../ports/custom-attributes.port";
import type { WebsitePublicFileUrlPort } from "../ports/public-file-url.port";
import {
  buildWebsiteSiteSettings,
  WEBSITE_SITE_SETTINGS_ENTITY_TYPE,
} from "../../domain/site-settings";
import { withResolvedSiteAssetUrls } from "./site-settings-assets";

type Deps = {
  logger: LoggerPort;
  siteRepo: WebsiteSiteRepositoryPort;
  customAttributes: WebsiteCustomAttributesPort;
  publicFileUrlPort: WebsitePublicFileUrlPort;
};

export class ResolveWebsitePublicSiteSettingsUseCase extends BaseUseCase<
  ResolveWebsitePublicSiteSettingsInput,
  ResolveWebsitePublicSiteSettingsOutput
> {
  constructor(protected readonly deps: Deps) {
    super({ logger: deps.logger });
  }

  protected validate(
    input: ResolveWebsitePublicSiteSettingsInput
  ): ResolveWebsitePublicSiteSettingsInput {
    if (!input.siteId?.trim()) {
      throw new ValidationError("siteId is required", undefined, "Website:InvalidSiteId");
    }
    return input;
  }

  protected async handle(
    input: ResolveWebsitePublicSiteSettingsInput,
    _ctx: UseCaseContext
  ): Promise<Result<ResolveWebsitePublicSiteSettingsOutput, UseCaseError>> {
    const site = await this.deps.siteRepo.findByIdPublic?.(input.siteId);
    if (!site) {
      return err(new NotFoundError("Site not found", undefined, "Website:SiteNotFound"));
    }

    const customSettings = await this.deps.customAttributes.getAttributes({
      tenantId: site.tenantId,
      entityType: WEBSITE_SITE_SETTINGS_ENTITY_TYPE,
      entityId: site.id,
    });

    const settings = buildWebsiteSiteSettings({
      siteName: site.name,
      brandingJson: site.brandingJson,
      themeJson: site.themeJson,
      custom: customSettings,
    });
    const resolvedSettings = await withResolvedSiteAssetUrls(settings, this.deps.publicFileUrlPort);

    return ok({
      siteId: site.id,
      siteSlug: site.slug,
      settings: resolvedSettings,
    });
  }
}
