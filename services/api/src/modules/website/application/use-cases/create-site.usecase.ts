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
import type { CreateWebsiteSiteInput, WebsiteSite } from "@corely/contracts";
import type { WebsiteSiteRepositoryPort } from "../ports/site-repository.port";
import type { WebsiteCustomAttributesPort } from "../ports/custom-attributes.port";
import type { IdGeneratorPort } from "@shared/ports/id-generator.port";
import type { ClockPort } from "@shared/ports/clock.port";
import { normalizeLocale, normalizeWebsiteSlug } from "../../domain/website.validators";
import {
  parseWebsiteSiteCommonSettingsForWrite,
  parseWebsiteSiteCustomSettingsForWrite,
  parseWebsiteSiteThemeSettingsForWrite,
  WEBSITE_SITE_SETTINGS_ENTITY_TYPE,
} from "../../domain/site-settings";

type Deps = {
  logger: LoggerPort;
  siteRepo: WebsiteSiteRepositoryPort;
  customAttributes: WebsiteCustomAttributesPort;
  idGenerator: IdGeneratorPort;
  clock: ClockPort;
};

@RequireTenant()
export class CreateWebsiteSiteUseCase extends BaseUseCase<CreateWebsiteSiteInput, WebsiteSite> {
  constructor(protected readonly deps: Deps) {
    super({ logger: deps.logger });
  }

  protected validate(input: CreateWebsiteSiteInput): CreateWebsiteSiteInput {
    if (!input.name?.trim()) {
      throw new ValidationError("name is required", undefined, "Website:InvalidName");
    }
    if (!input.slug?.trim()) {
      throw new ValidationError("slug is required", undefined, "Website:InvalidSlug");
    }
    if (!input.defaultLocale?.trim()) {
      throw new ValidationError("defaultLocale is required", undefined, "Website:InvalidLocale");
    }
    return input;
  }

  protected async handle(
    input: CreateWebsiteSiteInput,
    ctx: UseCaseContext
  ): Promise<Result<WebsiteSite, UseCaseError>> {
    if (!ctx.tenantId) {
      return err(new ValidationError("tenantId is required", undefined, "Website:TenantRequired"));
    }

    const now = this.deps.clock.now().toISOString();
    const slug = normalizeWebsiteSlug(input.slug);
    const siteName = input.name.trim();
    const commonSettings = parseWebsiteSiteCommonSettingsForWrite(
      input.common ?? input.brandingJson,
      siteName
    );
    const themeSettings = parseWebsiteSiteThemeSettingsForWrite(input.theme ?? input.themeJson);
    const customSettings = parseWebsiteSiteCustomSettingsForWrite(input.custom ?? {});

    const existingSlug = await this.deps.siteRepo.findBySlug(ctx.tenantId, slug);
    if (existingSlug) {
      return err(new ValidationError("slug is already in use", undefined, "Website:SlugTaken"));
    }

    const existingDefault = await this.deps.siteRepo.findDefaultByTenant(ctx.tenantId);
    const shouldDefault = input.isDefault ?? !existingDefault;

    const site: WebsiteSite = {
      id: this.deps.idGenerator.newId(),
      tenantId: ctx.tenantId,
      name: siteName,
      slug,
      defaultLocale: normalizeLocale(input.defaultLocale),
      brandingJson: commonSettings,
      themeJson: themeSettings,
      isDefault: shouldDefault,
      createdAt: now,
      updatedAt: now,
    };

    const created = await this.deps.siteRepo.create(site);
    if (Object.keys(customSettings).length > 0) {
      await this.deps.customAttributes.upsertAttributes({
        tenantId: ctx.tenantId,
        entityType: WEBSITE_SITE_SETTINGS_ENTITY_TYPE,
        entityId: created.id,
        attributes: customSettings,
      });
    }

    if (shouldDefault) {
      await this.deps.siteRepo.setDefault(ctx.tenantId, created.id);
      const refreshed = await this.deps.siteRepo.findById(ctx.tenantId, created.id);
      return ok(refreshed ?? { ...created, isDefault: true });
    }

    return ok(created);
  }
}
