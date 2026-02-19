import { type Provider } from "@nestjs/common";
import { OUTBOX_PORT, UNIT_OF_WORK, type OutboxPort, type UnitOfWorkPort } from "@corely/kernel";
import { NestLoggerAdapter } from "@/shared/adapters/logger/nest-logger.adapter";
import { ID_GENERATOR_TOKEN, type IdGeneratorPort } from "@/shared/ports/id-generator.port";
import { CLOCK_PORT_TOKEN, type ClockPort } from "@/shared/ports/clock.port";
import { PublicWorkspaceResolver } from "@/shared/public";
import { CreateWebsiteSiteUseCase } from "./application/use-cases/create-site.usecase";
import { UpdateWebsiteSiteUseCase } from "./application/use-cases/update-site.usecase";
import { ListWebsiteSitesUseCase } from "./application/use-cases/list-sites.usecase";
import { GetWebsiteSiteUseCase } from "./application/use-cases/get-site.usecase";
import { AddWebsiteDomainUseCase } from "./application/use-cases/add-domain.usecase";
import { RemoveWebsiteDomainUseCase } from "./application/use-cases/remove-domain.usecase";
import { ListWebsiteDomainsUseCase } from "./application/use-cases/list-domains.usecase";
import { CreateWebsitePageUseCase } from "./application/use-cases/create-page.usecase";
import { UpdateWebsitePageUseCase } from "./application/use-cases/update-page.usecase";
import { ListWebsitePagesUseCase } from "./application/use-cases/list-pages.usecase";
import { GetWebsitePageUseCase } from "./application/use-cases/get-page.usecase";
import { GetWebsitePageContentUseCase } from "./application/use-cases/get-page-content.usecase";
import { UpdateWebsitePageContentUseCase } from "./application/use-cases/update-page-content.usecase";
import { PublishWebsitePageUseCase } from "./application/use-cases/publish-page.usecase";
import { UnpublishWebsitePageUseCase } from "./application/use-cases/unpublish-page.usecase";
import { UpsertWebsiteMenuUseCase } from "./application/use-cases/upsert-menu.usecase";
import { ListWebsiteMenusUseCase } from "./application/use-cases/list-menus.usecase";
import { ResolveWebsitePublicPageUseCase } from "./application/use-cases/resolve-public-page.usecase";
import { ResolveWebsitePublicSiteSettingsUseCase } from "./application/use-cases/resolve-public-site-settings.usecase";
import { CreateWebsiteFeedbackUseCase } from "./application/use-cases/create-website-feedback.usecase";
import { ListWebsitePublicQaUseCase } from "./application/use-cases/list-website-public-qa.usecase";
import { ListWebsiteQaUseCase } from "./application/use-cases/list-website-qa.usecase";
import { CreateWebsiteQaUseCase } from "./application/use-cases/create-website-qa.usecase";
import { UpdateWebsiteQaUseCase } from "./application/use-cases/update-website-qa.usecase";
import { DeleteWebsiteQaUseCase } from "./application/use-cases/delete-website-qa.usecase";
import {
  WEBSITE_SITE_REPO_PORT,
  type WebsiteSiteRepositoryPort,
} from "./application/ports/site-repository.port";
import {
  WEBSITE_DOMAIN_REPO_PORT,
  type WebsiteDomainRepositoryPort,
} from "./application/ports/domain-repository.port";
import {
  WEBSITE_PAGE_REPO_PORT,
  type WebsitePageRepositoryPort,
} from "./application/ports/page-repository.port";
import {
  WEBSITE_MENU_REPO_PORT,
  type WebsiteMenuRepositoryPort,
} from "./application/ports/menu-repository.port";
import {
  WEBSITE_SNAPSHOT_REPO_PORT,
  type WebsiteSnapshotRepositoryPort,
} from "./application/ports/snapshot-repository.port";
import {
  WEBSITE_FEEDBACK_REPO_PORT,
  type WebsiteFeedbackRepositoryPort,
} from "./application/ports/feedback-repository.port";
import {
  WEBSITE_QA_REPO_PORT,
  type WebsiteQaRepositoryPort,
} from "./application/ports/qa-repository.port";
import { CMS_READ_PORT, type CmsReadPort } from "./application/ports/cms-read.port";
import {
  WEBSITE_PUBLIC_FILE_URL_PORT,
  type WebsitePublicFileUrlPort,
} from "./application/ports/public-file-url.port";
import {
  WEBSITE_CUSTOM_ATTRIBUTES_PORT,
  type WebsiteCustomAttributesPort,
} from "./application/ports/custom-attributes.port";
import { CMS_WRITE_PORT, type CmsWritePort } from "./application/ports/cms-write.port";

export const WEBSITE_USE_CASE_PROVIDERS: Provider[] = [
  {
    provide: CreateWebsiteSiteUseCase,
    useFactory: (
      siteRepo: WebsiteSiteRepositoryPort,
      customAttributes: WebsiteCustomAttributesPort,
      idGenerator: IdGeneratorPort,
      clock: ClockPort
    ) =>
      new CreateWebsiteSiteUseCase({
        logger: new NestLoggerAdapter(),
        siteRepo,
        customAttributes,
        idGenerator,
        clock,
      }),
    inject: [
      WEBSITE_SITE_REPO_PORT,
      WEBSITE_CUSTOM_ATTRIBUTES_PORT,
      ID_GENERATOR_TOKEN,
      CLOCK_PORT_TOKEN,
    ],
  },
  {
    provide: UpdateWebsiteSiteUseCase,
    useFactory: (
      siteRepo: WebsiteSiteRepositoryPort,
      customAttributes: WebsiteCustomAttributesPort,
      clock: ClockPort
    ) =>
      new UpdateWebsiteSiteUseCase({
        logger: new NestLoggerAdapter(),
        siteRepo,
        customAttributes,
        clock,
      }),
    inject: [WEBSITE_SITE_REPO_PORT, WEBSITE_CUSTOM_ATTRIBUTES_PORT, CLOCK_PORT_TOKEN],
  },
  {
    provide: ListWebsiteSitesUseCase,
    useFactory: (siteRepo: WebsiteSiteRepositoryPort) =>
      new ListWebsiteSitesUseCase({ logger: new NestLoggerAdapter(), siteRepo }),
    inject: [WEBSITE_SITE_REPO_PORT],
  },
  {
    provide: GetWebsiteSiteUseCase,
    useFactory: (
      siteRepo: WebsiteSiteRepositoryPort,
      customAttributes: WebsiteCustomAttributesPort,
      publicFileUrlPort: WebsitePublicFileUrlPort
    ) =>
      new GetWebsiteSiteUseCase({
        logger: new NestLoggerAdapter(),
        siteRepo,
        customAttributes,
        publicFileUrlPort,
      }),
    inject: [WEBSITE_SITE_REPO_PORT, WEBSITE_CUSTOM_ATTRIBUTES_PORT, WEBSITE_PUBLIC_FILE_URL_PORT],
  },
  {
    provide: AddWebsiteDomainUseCase,
    useFactory: (
      domainRepo: WebsiteDomainRepositoryPort,
      siteRepo: WebsiteSiteRepositoryPort,
      idGenerator: IdGeneratorPort,
      clock: ClockPort
    ) =>
      new AddWebsiteDomainUseCase({
        logger: new NestLoggerAdapter(),
        domainRepo,
        siteRepo,
        idGenerator,
        clock,
      }),
    inject: [
      WEBSITE_DOMAIN_REPO_PORT,
      WEBSITE_SITE_REPO_PORT,
      ID_GENERATOR_TOKEN,
      CLOCK_PORT_TOKEN,
    ],
  },
  {
    provide: RemoveWebsiteDomainUseCase,
    useFactory: (domainRepo: WebsiteDomainRepositoryPort) =>
      new RemoveWebsiteDomainUseCase({ logger: new NestLoggerAdapter(), domainRepo }),
    inject: [WEBSITE_DOMAIN_REPO_PORT],
  },
  {
    provide: ListWebsiteDomainsUseCase,
    useFactory: (domainRepo: WebsiteDomainRepositoryPort) =>
      new ListWebsiteDomainsUseCase({ logger: new NestLoggerAdapter(), domainRepo }),
    inject: [WEBSITE_DOMAIN_REPO_PORT],
  },
  {
    provide: CreateWebsitePageUseCase,
    useFactory: (
      pageRepo: WebsitePageRepositoryPort,
      siteRepo: WebsiteSiteRepositoryPort,
      cmsWrite: CmsWritePort,
      idGenerator: IdGeneratorPort,
      clock: ClockPort
    ) =>
      new CreateWebsitePageUseCase({
        logger: new NestLoggerAdapter(),
        pageRepo,
        siteRepo,
        cmsWrite,
        idGenerator,
        clock,
      }),
    inject: [
      WEBSITE_PAGE_REPO_PORT,
      WEBSITE_SITE_REPO_PORT,
      CMS_WRITE_PORT,
      ID_GENERATOR_TOKEN,
      CLOCK_PORT_TOKEN,
    ],
  },
  {
    provide: UpdateWebsitePageUseCase,
    useFactory: (pageRepo: WebsitePageRepositoryPort, cmsWrite: CmsWritePort, clock: ClockPort) =>
      new UpdateWebsitePageUseCase({ logger: new NestLoggerAdapter(), pageRepo, cmsWrite, clock }),
    inject: [WEBSITE_PAGE_REPO_PORT, CMS_WRITE_PORT, CLOCK_PORT_TOKEN],
  },
  {
    provide: ListWebsitePagesUseCase,
    useFactory: (pageRepo: WebsitePageRepositoryPort) =>
      new ListWebsitePagesUseCase({ logger: new NestLoggerAdapter(), pageRepo }),
    inject: [WEBSITE_PAGE_REPO_PORT],
  },
  {
    provide: GetWebsitePageUseCase,
    useFactory: (pageRepo: WebsitePageRepositoryPort) =>
      new GetWebsitePageUseCase({ logger: new NestLoggerAdapter(), pageRepo }),
    inject: [WEBSITE_PAGE_REPO_PORT],
  },
  {
    provide: GetWebsitePageContentUseCase,
    useFactory: (pageRepo: WebsitePageRepositoryPort, cmsRead: CmsReadPort) =>
      new GetWebsitePageContentUseCase({
        logger: new NestLoggerAdapter(),
        pageRepo,
        cmsRead,
      }),
    inject: [WEBSITE_PAGE_REPO_PORT, CMS_READ_PORT],
  },
  {
    provide: UpdateWebsitePageContentUseCase,
    useFactory: (pageRepo: WebsitePageRepositoryPort, cmsWrite: CmsWritePort, clock: ClockPort) =>
      new UpdateWebsitePageContentUseCase({
        logger: new NestLoggerAdapter(),
        pageRepo,
        cmsWrite,
        clock,
      }),
    inject: [WEBSITE_PAGE_REPO_PORT, CMS_WRITE_PORT, CLOCK_PORT_TOKEN],
  },
  {
    provide: PublishWebsitePageUseCase,
    useFactory: (
      pageRepo: WebsitePageRepositoryPort,
      snapshotRepo: WebsiteSnapshotRepositoryPort,
      cmsRead: CmsReadPort,
      siteRepo: WebsiteSiteRepositoryPort,
      menuRepo: WebsiteMenuRepositoryPort,
      customAttributes: WebsiteCustomAttributesPort,
      outbox: OutboxPort,
      uow: UnitOfWorkPort,
      idGenerator: IdGeneratorPort,
      clock: ClockPort
    ) =>
      new PublishWebsitePageUseCase({
        logger: new NestLoggerAdapter(),
        pageRepo,
        snapshotRepo,
        cmsRead,
        siteRepo,
        menuRepo,
        customAttributes,
        outbox,
        uow,
        idGenerator,
        clock,
      }),
    inject: [
      WEBSITE_PAGE_REPO_PORT,
      WEBSITE_SNAPSHOT_REPO_PORT,
      CMS_READ_PORT,
      WEBSITE_SITE_REPO_PORT,
      WEBSITE_MENU_REPO_PORT,
      WEBSITE_CUSTOM_ATTRIBUTES_PORT,
      OUTBOX_PORT,
      UNIT_OF_WORK,
      ID_GENERATOR_TOKEN,
      CLOCK_PORT_TOKEN,
    ],
  },
  {
    provide: UnpublishWebsitePageUseCase,
    useFactory: (
      pageRepo: WebsitePageRepositoryPort,
      outbox: OutboxPort,
      uow: UnitOfWorkPort,
      clock: ClockPort
    ) =>
      new UnpublishWebsitePageUseCase({
        logger: new NestLoggerAdapter(),
        pageRepo,
        outbox,
        uow,
        clock,
      }),
    inject: [WEBSITE_PAGE_REPO_PORT, OUTBOX_PORT, UNIT_OF_WORK, CLOCK_PORT_TOKEN],
  },
  {
    provide: UpsertWebsiteMenuUseCase,
    useFactory: (
      menuRepo: WebsiteMenuRepositoryPort,
      idGenerator: IdGeneratorPort,
      clock: ClockPort
    ) =>
      new UpsertWebsiteMenuUseCase({
        logger: new NestLoggerAdapter(),
        menuRepo,
        idGenerator,
        clock,
      }),
    inject: [WEBSITE_MENU_REPO_PORT, ID_GENERATOR_TOKEN, CLOCK_PORT_TOKEN],
  },
  {
    provide: ListWebsiteMenusUseCase,
    useFactory: (menuRepo: WebsiteMenuRepositoryPort) =>
      new ListWebsiteMenusUseCase({ logger: new NestLoggerAdapter(), menuRepo }),
    inject: [WEBSITE_MENU_REPO_PORT],
  },
  {
    provide: ResolveWebsitePublicPageUseCase,
    useFactory: (
      domainRepo: WebsiteDomainRepositoryPort,
      siteRepo: WebsiteSiteRepositoryPort,
      pageRepo: WebsitePageRepositoryPort,
      snapshotRepo: WebsiteSnapshotRepositoryPort,
      menuRepo: WebsiteMenuRepositoryPort,
      publicFileUrlPort: WebsitePublicFileUrlPort,
      cmsRead: CmsReadPort,
      customAttributes: WebsiteCustomAttributesPort,
      publicWorkspaceResolver: PublicWorkspaceResolver
    ) =>
      new ResolveWebsitePublicPageUseCase({
        logger: new NestLoggerAdapter(),
        domainRepo,
        siteRepo,
        pageRepo,
        snapshotRepo,
        menuRepo,
        publicFileUrlPort,
        cmsRead,
        customAttributes,
        publicWorkspaceResolver,
      }),
    inject: [
      WEBSITE_DOMAIN_REPO_PORT,
      WEBSITE_SITE_REPO_PORT,
      WEBSITE_PAGE_REPO_PORT,
      WEBSITE_SNAPSHOT_REPO_PORT,
      WEBSITE_MENU_REPO_PORT,
      WEBSITE_PUBLIC_FILE_URL_PORT,
      CMS_READ_PORT,
      WEBSITE_CUSTOM_ATTRIBUTES_PORT,
      PublicWorkspaceResolver,
    ],
  },
  {
    provide: ResolveWebsitePublicSiteSettingsUseCase,
    useFactory: (
      siteRepo: WebsiteSiteRepositoryPort,
      customAttributes: WebsiteCustomAttributesPort,
      publicFileUrlPort: WebsitePublicFileUrlPort
    ) =>
      new ResolveWebsitePublicSiteSettingsUseCase({
        logger: new NestLoggerAdapter(),
        siteRepo,
        customAttributes,
        publicFileUrlPort,
      }),
    inject: [WEBSITE_SITE_REPO_PORT, WEBSITE_CUSTOM_ATTRIBUTES_PORT, WEBSITE_PUBLIC_FILE_URL_PORT],
  },
  {
    provide: CreateWebsiteFeedbackUseCase,
    useFactory: (
      feedbackRepo: WebsiteFeedbackRepositoryPort,
      domainRepo: WebsiteDomainRepositoryPort,
      siteRepo: WebsiteSiteRepositoryPort,
      pageRepo: WebsitePageRepositoryPort,
      publicWorkspaceResolver: PublicWorkspaceResolver,
      idGenerator: IdGeneratorPort,
      clock: ClockPort
    ) =>
      new CreateWebsiteFeedbackUseCase({
        logger: new NestLoggerAdapter(),
        feedbackRepo,
        domainRepo,
        siteRepo,
        pageRepo,
        publicWorkspaceResolver,
        idGenerator,
        clock,
      }),
    inject: [
      WEBSITE_FEEDBACK_REPO_PORT,
      WEBSITE_DOMAIN_REPO_PORT,
      WEBSITE_SITE_REPO_PORT,
      WEBSITE_PAGE_REPO_PORT,
      PublicWorkspaceResolver,
      ID_GENERATOR_TOKEN,
      CLOCK_PORT_TOKEN,
    ],
  },
  {
    provide: ListWebsitePublicQaUseCase,
    useFactory: (
      qaRepo: WebsiteQaRepositoryPort,
      domainRepo: WebsiteDomainRepositoryPort,
      siteRepo: WebsiteSiteRepositoryPort,
      pageRepo: WebsitePageRepositoryPort,
      publicWorkspaceResolver: PublicWorkspaceResolver
    ) =>
      new ListWebsitePublicQaUseCase({
        logger: new NestLoggerAdapter(),
        qaRepo,
        domainRepo,
        siteRepo,
        pageRepo,
        publicWorkspaceResolver,
      }),
    inject: [
      WEBSITE_QA_REPO_PORT,
      WEBSITE_DOMAIN_REPO_PORT,
      WEBSITE_SITE_REPO_PORT,
      WEBSITE_PAGE_REPO_PORT,
      PublicWorkspaceResolver,
    ],
  },
  {
    provide: ListWebsiteQaUseCase,
    useFactory: (siteRepo: WebsiteSiteRepositoryPort, qaRepo: WebsiteQaRepositoryPort) =>
      new ListWebsiteQaUseCase({
        logger: new NestLoggerAdapter(),
        siteRepo,
        qaRepo,
      }),
    inject: [WEBSITE_SITE_REPO_PORT, WEBSITE_QA_REPO_PORT],
  },
  {
    provide: CreateWebsiteQaUseCase,
    useFactory: (
      siteRepo: WebsiteSiteRepositoryPort,
      qaRepo: WebsiteQaRepositoryPort,
      idGenerator: IdGeneratorPort,
      clock: ClockPort
    ) =>
      new CreateWebsiteQaUseCase({
        logger: new NestLoggerAdapter(),
        siteRepo,
        qaRepo,
        idGenerator,
        clock,
      }),
    inject: [WEBSITE_SITE_REPO_PORT, WEBSITE_QA_REPO_PORT, ID_GENERATOR_TOKEN, CLOCK_PORT_TOKEN],
  },
  {
    provide: UpdateWebsiteQaUseCase,
    useFactory: (qaRepo: WebsiteQaRepositoryPort, clock: ClockPort) =>
      new UpdateWebsiteQaUseCase({
        logger: new NestLoggerAdapter(),
        qaRepo,
        clock,
      }),
    inject: [WEBSITE_QA_REPO_PORT, CLOCK_PORT_TOKEN],
  },
  {
    provide: DeleteWebsiteQaUseCase,
    useFactory: (qaRepo: WebsiteQaRepositoryPort) =>
      new DeleteWebsiteQaUseCase({
        logger: new NestLoggerAdapter(),
        qaRepo,
      }),
    inject: [WEBSITE_QA_REPO_PORT],
  },
];
