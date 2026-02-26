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
  GetPublicWebsiteExternalContentInput,
  WebsiteExternalContentEnvelopeByKey,
} from "@corely/contracts";
import { parseWebsiteExternalContentData } from "@corely/contracts";
import type { WebsiteSiteRepositoryPort } from "../../ports/site-repository.port";
import type { WebsiteCustomAttributesPort } from "../../ports/custom-attributes.port";
import { WEBSITE_SITE_SETTINGS_ENTITY_TYPE } from "../../../domain/site-settings";
import {
  WEBSITE_EXTERNAL_CONTENT_DRAFT_SETTINGS_KEY,
  WEBSITE_EXTERNAL_CONTENT_PUBLISHED_SETTINGS_KEY,
  getWebsiteExternalContentValue,
  normalizeWebsiteExternalContentLocale,
  readWebsiteExternalContentStorage,
  toWebsiteExternalContentLocaleSlot,
} from "../../../domain/external-content/external-content";
import { isWebsitePreviewTokenValid } from "../../../domain/preview-token";

type Deps = {
  logger: LoggerPort;
  siteRepo: WebsiteSiteRepositoryPort;
  customAttributes: WebsiteCustomAttributesPort;
};

export class GetPublicWebsiteExternalContentUseCase extends BaseUseCase<
  GetPublicWebsiteExternalContentInput,
  WebsiteExternalContentEnvelopeByKey
> {
  constructor(protected readonly deps: Deps) {
    super({ logger: deps.logger });
  }

  protected validate(
    input: GetPublicWebsiteExternalContentInput
  ): GetPublicWebsiteExternalContentInput {
    if (!input.siteId?.trim()) {
      throw new ValidationError("siteId is required", undefined, "Website:InvalidSiteId");
    }
    return input;
  }

  protected async handle(
    input: GetPublicWebsiteExternalContentInput,
    _ctx: UseCaseContext
  ): Promise<Result<WebsiteExternalContentEnvelopeByKey, UseCaseError>> {
    if (input.mode === "preview" && !isWebsitePreviewTokenValid(input.previewToken)) {
      return err(
        new ValidationError("preview token is invalid", undefined, "Website:InvalidPreviewToken")
      );
    }

    const site = await this.deps.siteRepo.findByIdPublic?.(input.siteId);
    if (!site) {
      return err(new NotFoundError("Site not found", undefined, "Website:SiteNotFound"));
    }

    const normalizedLocale = normalizeWebsiteExternalContentLocale(input.locale);
    const localeSlot = toWebsiteExternalContentLocaleSlot(normalizedLocale);
    const sourceKey =
      input.mode === "preview"
        ? WEBSITE_EXTERNAL_CONTENT_DRAFT_SETTINGS_KEY
        : WEBSITE_EXTERNAL_CONTENT_PUBLISHED_SETTINGS_KEY;

    const customSettings = await this.deps.customAttributes.getAttributes({
      tenantId: site.tenantId,
      entityType: WEBSITE_SITE_SETTINGS_ENTITY_TYPE,
      entityId: site.id,
    });
    const storage = readWebsiteExternalContentStorage(customSettings[sourceKey]);
    const rawData = getWebsiteExternalContentValue({
      storage,
      key: input.key,
      localeSlot,
    });

    let data: WebsiteExternalContentEnvelopeByKey["data"];
    try {
      data = parseWebsiteExternalContentData(input.key, rawData ?? {});
    } catch {
      return err(
        new ValidationError(
          "External content data is invalid",
          undefined,
          "Website:ExternalContentInvalid"
        )
      );
    }

    return ok({
      key: input.key,
      locale: normalizedLocale,
      version: input.mode === "preview" ? "draft" : "published",
      updatedAt: site.updatedAt,
      data,
    });
  }
}
