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
  type OutboxPort,
} from "@corely/kernel";
import type {
  WebsiteExternalContentEnvelopeByKey,
  WebsiteExternalContentKey,
} from "@corely/contracts";
import { parseWebsiteExternalContentData } from "@corely/contracts";
import type { ClockPort } from "@shared/ports/clock.port";
import type { WebsiteSiteRepositoryPort } from "../../ports/site-repository.port";
import type { WebsiteCustomAttributesPort } from "../../ports/custom-attributes.port";
import { WEBSITE_SITE_SETTINGS_ENTITY_TYPE } from "../../../domain/site-settings";
import {
  WEBSITE_EXTERNAL_CONTENT_DRAFT_SETTINGS_KEY,
  WEBSITE_EXTERNAL_CONTENT_PUBLISHED_SETTINGS_KEY,
  getWebsiteExternalContentValue,
  normalizeWebsiteExternalContentLocale,
  readWebsiteExternalContentStorage,
  setWebsiteExternalContentValue,
  toWebsiteExternalContentLocaleSlot,
} from "../../../domain/external-content/external-content";

type Deps = {
  logger: LoggerPort;
  siteRepo: WebsiteSiteRepositoryPort;
  customAttributes: WebsiteCustomAttributesPort;
  outbox: OutboxPort;
  clock: ClockPort;
};

export type PublishWebsiteExternalContentInput = {
  siteId: string;
  key: WebsiteExternalContentKey;
  locale?: string;
};

@RequireTenant()
export class PublishWebsiteExternalContentUseCase extends BaseUseCase<
  PublishWebsiteExternalContentInput,
  WebsiteExternalContentEnvelopeByKey
> {
  constructor(protected readonly deps: Deps) {
    super({ logger: deps.logger });
  }

  protected async handle(
    input: PublishWebsiteExternalContentInput,
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
    const draftStorage = readWebsiteExternalContentStorage(
      customSettings[WEBSITE_EXTERNAL_CONTENT_DRAFT_SETTINGS_KEY]
    );
    const draftData = getWebsiteExternalContentValue({
      storage: draftStorage,
      key: input.key,
      localeSlot,
    });
    if (draftData === undefined) {
      return err(
        new NotFoundError("External content draft not found", undefined, "Website:DraftNotFound")
      );
    }

    let validatedData: WebsiteExternalContentEnvelopeByKey["data"];
    try {
      validatedData = parseWebsiteExternalContentData(input.key, draftData);
    } catch {
      return err(
        new ValidationError(
          "External content draft is invalid",
          undefined,
          "Website:ExternalContentInvalid"
        )
      );
    }
    const publishedStorage = readWebsiteExternalContentStorage(
      customSettings[WEBSITE_EXTERNAL_CONTENT_PUBLISHED_SETTINGS_KEY]
    );
    const nextPublishedStorage = setWebsiteExternalContentValue({
      storage: publishedStorage,
      key: input.key,
      localeSlot,
      data: validatedData,
    });

    await this.deps.customAttributes.upsertAttributes({
      tenantId: ctx.tenantId,
      entityType: WEBSITE_SITE_SETTINGS_ENTITY_TYPE,
      entityId: site.id,
      attributes: {
        [WEBSITE_EXTERNAL_CONTENT_PUBLISHED_SETTINGS_KEY]: nextPublishedStorage,
      },
    });

    const publishedAt = this.deps.clock.now().toISOString();
    await this.deps.siteRepo.update({
      ...site,
      updatedAt: publishedAt,
    });

    await this.deps.outbox.enqueue({
      tenantId: ctx.tenantId,
      eventType: "website.externalContent.published",
      payload: {
        siteId: site.id,
        key: input.key,
        locale: normalizedLocale,
        publishedAt,
      },
      correlationId: ctx.correlationId,
    });

    return ok({
      key: input.key,
      locale: normalizedLocale,
      version: "published",
      updatedAt: publishedAt,
      data: validatedData,
    });
  }
}
