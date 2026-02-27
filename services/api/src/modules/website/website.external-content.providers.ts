import { type Provider } from "@nestjs/common";
import { OUTBOX_PORT, type OutboxPort } from "@corely/kernel";
import { NestLoggerAdapter } from "@/shared/adapters/logger/nest-logger.adapter";
import { CLOCK_PORT_TOKEN, type ClockPort } from "@/shared/ports/clock.port";
import { GetWebsiteExternalContentDraftUseCase } from "./application/use-cases/external-content/get-website-external-content-draft.usecase";
import { PatchWebsiteExternalContentDraftUseCase } from "./application/use-cases/external-content/patch-website-external-content-draft.usecase";
import { PublishWebsiteExternalContentUseCase } from "./application/use-cases/external-content/publish-website-external-content.usecase";
import { GetPublicWebsiteExternalContentUseCase } from "./application/use-cases/external-content/get-public-website-external-content.usecase";
import {
  WEBSITE_SITE_REPO_PORT,
  type WebsiteSiteRepositoryPort,
} from "./application/ports/site-repository.port";
import {
  WEBSITE_CUSTOM_ATTRIBUTES_PORT,
  type WebsiteCustomAttributesPort,
} from "./application/ports/custom-attributes.port";

export const WEBSITE_EXTERNAL_CONTENT_USE_CASE_PROVIDERS: Provider[] = [
  {
    provide: GetWebsiteExternalContentDraftUseCase,
    useFactory: (
      siteRepo: WebsiteSiteRepositoryPort,
      customAttributes: WebsiteCustomAttributesPort
    ) =>
      new GetWebsiteExternalContentDraftUseCase({
        logger: new NestLoggerAdapter(),
        siteRepo,
        customAttributes,
      }),
    inject: [WEBSITE_SITE_REPO_PORT, WEBSITE_CUSTOM_ATTRIBUTES_PORT],
  },
  {
    provide: PatchWebsiteExternalContentDraftUseCase,
    useFactory: (
      siteRepo: WebsiteSiteRepositoryPort,
      customAttributes: WebsiteCustomAttributesPort,
      clock: ClockPort
    ) =>
      new PatchWebsiteExternalContentDraftUseCase({
        logger: new NestLoggerAdapter(),
        siteRepo,
        customAttributes,
        clock,
      }),
    inject: [WEBSITE_SITE_REPO_PORT, WEBSITE_CUSTOM_ATTRIBUTES_PORT, CLOCK_PORT_TOKEN],
  },
  {
    provide: PublishWebsiteExternalContentUseCase,
    useFactory: (
      siteRepo: WebsiteSiteRepositoryPort,
      customAttributes: WebsiteCustomAttributesPort,
      outbox: OutboxPort,
      clock: ClockPort
    ) =>
      new PublishWebsiteExternalContentUseCase({
        logger: new NestLoggerAdapter(),
        siteRepo,
        customAttributes,
        outbox,
        clock,
      }),
    inject: [WEBSITE_SITE_REPO_PORT, WEBSITE_CUSTOM_ATTRIBUTES_PORT, OUTBOX_PORT, CLOCK_PORT_TOKEN],
  },
  {
    provide: GetPublicWebsiteExternalContentUseCase,
    useFactory: (
      siteRepo: WebsiteSiteRepositoryPort,
      customAttributes: WebsiteCustomAttributesPort
    ) =>
      new GetPublicWebsiteExternalContentUseCase({
        logger: new NestLoggerAdapter(),
        siteRepo,
        customAttributes,
      }),
    inject: [WEBSITE_SITE_REPO_PORT, WEBSITE_CUSTOM_ATTRIBUTES_PORT],
  },
];
