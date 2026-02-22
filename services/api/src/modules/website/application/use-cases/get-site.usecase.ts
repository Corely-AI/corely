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

@RequireTenant()
export class GetWebsiteSiteUseCase extends BaseUseCase<{ siteId: string }, GetWebsiteSiteOutput> {
  constructor(protected readonly deps: Deps) {
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

    const customSettings = await this.deps.customAttributes.getAttributes({
      tenantId: ctx.tenantId,
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
      site: {
        ...site,
        brandingJson: resolvedSettings.common,
        themeJson: resolvedSettings.theme,
        settings: resolvedSettings,
      },
    });
  }
}
