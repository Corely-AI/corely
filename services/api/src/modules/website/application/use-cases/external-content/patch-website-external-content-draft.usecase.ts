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
import type { ClockPort } from "@shared/ports/clock.port";
import type { WebsiteSiteRepositoryPort } from "../../ports/site-repository.port";
import type { WebsiteCustomAttributesPort } from "../../ports/custom-attributes.port";
import { WEBSITE_SITE_SETTINGS_ENTITY_TYPE } from "../../../domain/site-settings";
import {
  WEBSITE_EXTERNAL_CONTENT_DRAFT_SETTINGS_KEY,
  normalizeWebsiteExternalContentLocale,
  readWebsiteExternalContentStorage,
  setWebsiteExternalContentValue,
  toWebsiteExternalContentLocaleSlot,
} from "../../../domain/external-content/external-content";

type Deps = {
  logger: LoggerPort;
  siteRepo: WebsiteSiteRepositoryPort;
  customAttributes: WebsiteCustomAttributesPort;
  clock: ClockPort;
};

export type PatchWebsiteExternalContentDraftInput = {
  siteId: string;
  key: WebsiteExternalContentKey;
  locale?: string;
  data: unknown;
};

@RequireTenant()
export class PatchWebsiteExternalContentDraftUseCase extends BaseUseCase<
  PatchWebsiteExternalContentDraftInput,
  WebsiteExternalContentEnvelopeByKey
> {
  constructor(protected readonly deps: Deps) {
    super({ logger: deps.logger });
  }

  protected async handle(
    input: PatchWebsiteExternalContentDraftInput,
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
    let validatedData: WebsiteExternalContentEnvelopeByKey["data"];
    try {
      validatedData = parseWebsiteExternalContentData(input.key, input.data);
    } catch {
      return err(
        new ValidationError(
          "External content data is invalid",
          undefined,
          "Website:ExternalContentInvalid"
        )
      );
    }

    const customSettings = await this.deps.customAttributes.getAttributes({
      tenantId: ctx.tenantId,
      entityType: WEBSITE_SITE_SETTINGS_ENTITY_TYPE,
      entityId: site.id,
    });
    const draftStorage = readWebsiteExternalContentStorage(
      customSettings[WEBSITE_EXTERNAL_CONTENT_DRAFT_SETTINGS_KEY]
    );
    const nextDraftStorage = setWebsiteExternalContentValue({
      storage: draftStorage,
      key: input.key,
      localeSlot,
      data: validatedData,
    });

    await this.deps.customAttributes.upsertAttributes({
      tenantId: ctx.tenantId,
      entityType: WEBSITE_SITE_SETTINGS_ENTITY_TYPE,
      entityId: site.id,
      attributes: {
        [WEBSITE_EXTERNAL_CONTENT_DRAFT_SETTINGS_KEY]: nextDraftStorage,
      },
    });

    const updatedAt = this.deps.clock.now().toISOString();
    await this.deps.siteRepo.update({
      ...site,
      updatedAt,
    });

    return ok({
      key: input.key,
      locale: normalizedLocale,
      version: "draft",
      updatedAt,
      data: validatedData,
    });
  }
}
