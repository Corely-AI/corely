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
import type {
  WebsiteExternalContentEnvelopeByKey,
  WebsiteExternalContentKey,
} from "@corely/contracts";
import { parseWebsiteExternalContentData } from "@corely/contracts";
import type { WebsiteSiteRepositoryPort } from "../../ports/site-repository.port";
import type { WebsiteCustomAttributesPort } from "../../ports/custom-attributes.port";
import { WEBSITE_SITE_SETTINGS_ENTITY_TYPE } from "../../../domain/site-settings";
import {
  WEBSITE_EXTERNAL_CONTENT_DRAFT_SETTINGS_KEY,
  getWebsiteExternalContentValue,
  normalizeWebsiteExternalContentLocale,
  readWebsiteExternalContentStorage,
  toWebsiteExternalContentLocaleSlot,
} from "../../../domain/external-content/external-content";

type Deps = {
  logger: LoggerPort;
  siteRepo: WebsiteSiteRepositoryPort;
  customAttributes: WebsiteCustomAttributesPort;
};

export type GetWebsiteExternalContentDraftInput = {
  siteId: string;
  key: WebsiteExternalContentKey;
  locale?: string;
};

@RequireTenant()
export class GetWebsiteExternalContentDraftUseCase extends BaseUseCase<
  GetWebsiteExternalContentDraftInput,
  WebsiteExternalContentEnvelopeByKey
> {
  constructor(protected readonly deps: Deps) {
    super({ logger: deps.logger });
  }

  protected async handle(
    input: GetWebsiteExternalContentDraftInput,
    ctx: UseCaseContext
  ): Promise<Result<WebsiteExternalContentEnvelopeByKey, UseCaseError>> {
    if (!ctx.tenantId) {
      return err(new ValidationError("tenantId is required", undefined, "Website:TenantRequired"));
    }

    const site = await this.deps.siteRepo.findById(ctx.tenantId, input.siteId);
    if (!site) {
      return err(new NotFoundError("Site not found", undefined, "Website:SiteNotFound"));
    }

    const normalizedLocale = normalizeWebsiteExternalContentLocale(input.locale);
    const localeSlot = toWebsiteExternalContentLocaleSlot(normalizedLocale);

    const customSettings = await this.deps.customAttributes.getAttributes({
      tenantId: ctx.tenantId,
      entityType: WEBSITE_SITE_SETTINGS_ENTITY_TYPE,
      entityId: site.id,
    });

    const storage = readWebsiteExternalContentStorage(
      customSettings[WEBSITE_EXTERNAL_CONTENT_DRAFT_SETTINGS_KEY]
    );
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
          "Stored external content is invalid",
          undefined,
          "Website:ExternalContentInvalid"
        )
      );
    }

    return ok({
      key: input.key,
      locale: normalizedLocale,
      version: "draft",
      updatedAt: site.updatedAt,
      data,
    });
  }
}
