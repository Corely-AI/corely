import { Module } from "@nestjs/common";
import { DataModule } from "@corely/data";
import { OUTBOX_PORT, UNIT_OF_WORK, type OutboxPort, type UnitOfWorkPort } from "@corely/kernel";
import { EnvService } from "@corely/config";
import { PromptRegistry } from "@corely/prompts";
import { PromptUsageLogger } from "@/shared/prompts/prompt-usage.logger";
import { KernelModule } from "@/shared/kernel/kernel.module";
import { IdentityModule } from "@/modules/identity";
import { PromptModule } from "@/shared/prompts/prompt.module";
import { CmsModule } from "@/modules/cms";
import { CmsApplication } from "@/modules/cms/application/cms.application";
import { NestLoggerAdapter } from "@/shared/adapters/logger/nest-logger.adapter";
import { ID_GENERATOR_TOKEN, type IdGeneratorPort } from "@/shared/ports/id-generator.port";
import { CLOCK_PORT_TOKEN, type ClockPort } from "@/shared/ports/clock.port";
import {
  IDEMPOTENCY_STORAGE_PORT_TOKEN,
  type IdempotencyStoragePort,
} from "@/shared/ports/idempotency-storage.port";
import { WebsiteSitesController } from "./adapters/http/website-sites.controller";
import { WebsiteDomainsController } from "./adapters/http/website-domains.controller";
import { WebsitePagesController } from "./adapters/http/website-pages.controller";
import { WebsiteMenusController } from "./adapters/http/website-menus.controller";
import { WebsiteQaController } from "./adapters/http/website-qa.controller";
import { WebsiteWallOfLoveController } from "./adapters/http/website-wall-of-love.controller";
import { WebsitePublicController } from "./adapters/http/website-public.controller";
import { WebsiteAiController } from "./adapters/http/website-ai.controller";
import { WebsiteApplication } from "./application/website.application";
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
import { PublishWebsitePageUseCase } from "./application/use-cases/publish-page.usecase";
import { UnpublishWebsitePageUseCase } from "./application/use-cases/unpublish-page.usecase";
import { UpsertWebsiteMenuUseCase } from "./application/use-cases/upsert-menu.usecase";
import { ListWebsiteMenusUseCase } from "./application/use-cases/list-menus.usecase";
import { ResolveWebsitePublicPageUseCase } from "./application/use-cases/resolve-public-page.usecase";
import { GenerateWebsitePageFromPromptUseCase } from "./application/use-cases/generate-page-from-prompt.usecase";
import { WebsiteSlugExistsUseCase } from "./application/use-cases/slug-exists.usecase";
import { CreateWebsiteFeedbackUseCase } from "./application/use-cases/create-website-feedback.usecase";
import { ListWebsitePublicQaUseCase } from "./application/use-cases/list-website-public-qa.usecase";
import { ListWebsiteQaUseCase } from "./application/use-cases/list-website-qa.usecase";
import { CreateWebsiteQaUseCase } from "./application/use-cases/create-website-qa.usecase";
import { UpdateWebsiteQaUseCase } from "./application/use-cases/update-website-qa.usecase";
import { DeleteWebsiteQaUseCase } from "./application/use-cases/delete-website-qa.usecase";
import { ListWebsiteWallOfLoveItemsUseCase } from "./application/use-cases/list-website-wall-of-love-items.usecase";
import { CreateWebsiteWallOfLoveItemUseCase } from "./application/use-cases/create-website-wall-of-love-item.usecase";
import { UpdateWebsiteWallOfLoveItemUseCase } from "./application/use-cases/update-website-wall-of-love-item.usecase";
import { ReorderWebsiteWallOfLoveItemsUseCase } from "./application/use-cases/reorder-website-wall-of-love-items.usecase";
import { PublishWebsiteWallOfLoveItemUseCase } from "./application/use-cases/publish-website-wall-of-love-item.usecase";
import { UnpublishWebsiteWallOfLoveItemUseCase } from "./application/use-cases/unpublish-website-wall-of-love-item.usecase";
import { ListPublicWebsiteWallOfLoveItemsUseCase } from "./application/use-cases/list-public-website-wall-of-love-items.usecase";
import { PrismaWebsiteSiteRepository } from "./infrastructure/prisma/prisma-website-site-repository.adapter";
import { PrismaWebsiteDomainRepository } from "./infrastructure/prisma/prisma-website-domain-repository.adapter";
import { PrismaWebsitePageRepository } from "./infrastructure/prisma/prisma-website-page-repository.adapter";
import { PrismaWebsiteMenuRepository } from "./infrastructure/prisma/prisma-website-menu-repository.adapter";
import { PrismaWebsiteSnapshotRepository } from "./infrastructure/prisma/prisma-website-snapshot-repository.adapter";
import { PrismaWebsiteFeedbackRepository } from "./infrastructure/prisma/prisma-website-feedback-repository.adapter";
import { PrismaWebsiteQaRepository } from "./infrastructure/prisma/prisma-website-qa-repository.adapter";
import { PrismaWebsiteWallOfLoveRepository } from "./infrastructure/prisma/prisma-website-wall-of-love-repository.adapter";
import { PrismaWebsiteWallOfLoveImagesRepository } from "./infrastructure/prisma/prisma-website-wall-of-love-images-repository.adapter";
import { CmsWebsitePortAdapter } from "./infrastructure/cms/cms-website-port.adapter";
import { AiSdkWebsitePageGenerator } from "./infrastructure/ai/ai-sdk-website-page-generator.adapter";
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
import {
  WEBSITE_WALL_OF_LOVE_REPO_PORT,
  type WebsiteWallOfLoveRepositoryPort,
} from "./application/ports/wall-of-love-repository.port";
import {
  WEBSITE_WALL_OF_LOVE_IMAGES_REPO_PORT,
  type WebsiteWallOfLoveImagesRepositoryPort,
} from "./application/ports/wall-of-love-images-repository.port";
import { CMS_READ_PORT, type CmsReadPort } from "./application/ports/cms-read.port";
import { CMS_WRITE_PORT, type CmsWritePort } from "./application/ports/cms-write.port";
import { WEBSITE_AI_PORT, type WebsiteAiGeneratorPort } from "./application/ports/website-ai.port";
import { PublicWorkspaceResolver } from "@/shared/public";

@Module({
  imports: [DataModule, KernelModule, IdentityModule, PromptModule, CmsModule],
  controllers: [
    WebsiteSitesController,
    WebsiteDomainsController,
    WebsitePagesController,
    WebsiteMenusController,
    WebsiteQaController,
    WebsiteWallOfLoveController,
    WebsitePublicController,
    WebsiteAiController,
  ],
  providers: [
    PublicWorkspaceResolver,
    PrismaWebsiteSiteRepository,
    { provide: WEBSITE_SITE_REPO_PORT, useExisting: PrismaWebsiteSiteRepository },
    PrismaWebsiteDomainRepository,
    { provide: WEBSITE_DOMAIN_REPO_PORT, useExisting: PrismaWebsiteDomainRepository },
    PrismaWebsitePageRepository,
    { provide: WEBSITE_PAGE_REPO_PORT, useExisting: PrismaWebsitePageRepository },
    PrismaWebsiteMenuRepository,
    { provide: WEBSITE_MENU_REPO_PORT, useExisting: PrismaWebsiteMenuRepository },
    PrismaWebsiteSnapshotRepository,
    { provide: WEBSITE_SNAPSHOT_REPO_PORT, useExisting: PrismaWebsiteSnapshotRepository },
    PrismaWebsiteFeedbackRepository,
    { provide: WEBSITE_FEEDBACK_REPO_PORT, useExisting: PrismaWebsiteFeedbackRepository },
    PrismaWebsiteQaRepository,
    { provide: WEBSITE_QA_REPO_PORT, useExisting: PrismaWebsiteQaRepository },
    PrismaWebsiteWallOfLoveRepository,
    { provide: WEBSITE_WALL_OF_LOVE_REPO_PORT, useExisting: PrismaWebsiteWallOfLoveRepository },
    PrismaWebsiteWallOfLoveImagesRepository,
    {
      provide: WEBSITE_WALL_OF_LOVE_IMAGES_REPO_PORT,
      useExisting: PrismaWebsiteWallOfLoveImagesRepository,
    },
    {
      provide: CmsWebsitePortAdapter,
      useFactory: (cms: CmsApplication) => new CmsWebsitePortAdapter(cms),
      inject: [CmsApplication],
    },
    {
      provide: CMS_READ_PORT,
      useFactory: (adapter: CmsWebsitePortAdapter) => adapter,
      inject: [CmsWebsitePortAdapter],
    },
    {
      provide: CMS_WRITE_PORT,
      useFactory: (adapter: CmsWebsitePortAdapter) => adapter,
      inject: [CmsWebsitePortAdapter],
    },
    {
      provide: WEBSITE_AI_PORT,
      useFactory: (env: EnvService, registry: PromptRegistry, logger: PromptUsageLogger) =>
        new AiSdkWebsitePageGenerator(env, registry, logger),
      inject: [EnvService, PromptRegistry, PromptUsageLogger],
    },
    {
      provide: CreateWebsiteSiteUseCase,
      useFactory: (
        siteRepo: WebsiteSiteRepositoryPort,
        idGenerator: IdGeneratorPort,
        clock: ClockPort
      ) =>
        new CreateWebsiteSiteUseCase({
          logger: new NestLoggerAdapter(),
          siteRepo,
          idGenerator,
          clock,
        }),
      inject: [WEBSITE_SITE_REPO_PORT, ID_GENERATOR_TOKEN, CLOCK_PORT_TOKEN],
    },
    {
      provide: UpdateWebsiteSiteUseCase,
      useFactory: (siteRepo: WebsiteSiteRepositoryPort, clock: ClockPort) =>
        new UpdateWebsiteSiteUseCase({
          logger: new NestLoggerAdapter(),
          siteRepo,
          clock,
        }),
      inject: [WEBSITE_SITE_REPO_PORT, CLOCK_PORT_TOKEN],
    },
    {
      provide: ListWebsiteSitesUseCase,
      useFactory: (siteRepo: WebsiteSiteRepositoryPort) =>
        new ListWebsiteSitesUseCase({ logger: new NestLoggerAdapter(), siteRepo }),
      inject: [WEBSITE_SITE_REPO_PORT],
    },
    {
      provide: GetWebsiteSiteUseCase,
      useFactory: (siteRepo: WebsiteSiteRepositoryPort) =>
        new GetWebsiteSiteUseCase({ logger: new NestLoggerAdapter(), siteRepo }),
      inject: [WEBSITE_SITE_REPO_PORT],
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
        idGenerator: IdGeneratorPort,
        clock: ClockPort
      ) =>
        new CreateWebsitePageUseCase({
          logger: new NestLoggerAdapter(),
          pageRepo,
          siteRepo,
          idGenerator,
          clock,
        }),
      inject: [
        WEBSITE_PAGE_REPO_PORT,
        WEBSITE_SITE_REPO_PORT,
        ID_GENERATOR_TOKEN,
        CLOCK_PORT_TOKEN,
      ],
    },
    {
      provide: UpdateWebsitePageUseCase,
      useFactory: (pageRepo: WebsitePageRepositoryPort, clock: ClockPort) =>
        new UpdateWebsitePageUseCase({ logger: new NestLoggerAdapter(), pageRepo, clock }),
      inject: [WEBSITE_PAGE_REPO_PORT, CLOCK_PORT_TOKEN],
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
      provide: PublishWebsitePageUseCase,
      useFactory: (
        pageRepo: WebsitePageRepositoryPort,
        snapshotRepo: WebsiteSnapshotRepositoryPort,
        cmsRead: CmsReadPort,
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
          outbox,
          uow,
          idGenerator,
          clock,
        }),
      inject: [
        WEBSITE_PAGE_REPO_PORT,
        WEBSITE_SNAPSHOT_REPO_PORT,
        CMS_READ_PORT,
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
        cmsRead: CmsReadPort,
        publicWorkspaceResolver: PublicWorkspaceResolver
      ) =>
        new ResolveWebsitePublicPageUseCase({
          logger: new NestLoggerAdapter(),
          domainRepo,
          siteRepo,
          pageRepo,
          snapshotRepo,
          menuRepo,
          cmsRead,
          publicWorkspaceResolver,
        }),
      inject: [
        WEBSITE_DOMAIN_REPO_PORT,
        WEBSITE_SITE_REPO_PORT,
        WEBSITE_PAGE_REPO_PORT,
        WEBSITE_SNAPSHOT_REPO_PORT,
        WEBSITE_MENU_REPO_PORT,
        CMS_READ_PORT,
        PublicWorkspaceResolver,
      ],
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
    {
      provide: ListWebsiteWallOfLoveItemsUseCase,
      useFactory: (
        siteRepo: WebsiteSiteRepositoryPort,
        wallOfLoveRepo: WebsiteWallOfLoveRepositoryPort,
        wallOfLoveImagesRepo: WebsiteWallOfLoveImagesRepositoryPort
      ) =>
        new ListWebsiteWallOfLoveItemsUseCase({
          logger: new NestLoggerAdapter(),
          siteRepo,
          wallOfLoveRepo,
          wallOfLoveImagesRepo,
        }),
      inject: [
        WEBSITE_SITE_REPO_PORT,
        WEBSITE_WALL_OF_LOVE_REPO_PORT,
        WEBSITE_WALL_OF_LOVE_IMAGES_REPO_PORT,
      ],
    },
    {
      provide: CreateWebsiteWallOfLoveItemUseCase,
      useFactory: (
        siteRepo: WebsiteSiteRepositoryPort,
        wallOfLoveRepo: WebsiteWallOfLoveRepositoryPort,
        wallOfLoveImagesRepo: WebsiteWallOfLoveImagesRepositoryPort,
        idGenerator: IdGeneratorPort,
        clock: ClockPort
      ) =>
        new CreateWebsiteWallOfLoveItemUseCase({
          logger: new NestLoggerAdapter(),
          siteRepo,
          wallOfLoveRepo,
          wallOfLoveImagesRepo,
          idGenerator,
          clock,
        }),
      inject: [
        WEBSITE_SITE_REPO_PORT,
        WEBSITE_WALL_OF_LOVE_REPO_PORT,
        WEBSITE_WALL_OF_LOVE_IMAGES_REPO_PORT,
        ID_GENERATOR_TOKEN,
        CLOCK_PORT_TOKEN,
      ],
    },
    {
      provide: UpdateWebsiteWallOfLoveItemUseCase,
      useFactory: (
        wallOfLoveRepo: WebsiteWallOfLoveRepositoryPort,
        wallOfLoveImagesRepo: WebsiteWallOfLoveImagesRepositoryPort,
        clock: ClockPort,
        idGenerator: IdGeneratorPort
      ) =>
        new UpdateWebsiteWallOfLoveItemUseCase({
          logger: new NestLoggerAdapter(),
          wallOfLoveRepo,
          wallOfLoveImagesRepo,
          clock,
          idGenerator,
        }),
      inject: [
        WEBSITE_WALL_OF_LOVE_REPO_PORT,
        WEBSITE_WALL_OF_LOVE_IMAGES_REPO_PORT,
        CLOCK_PORT_TOKEN,
        ID_GENERATOR_TOKEN,
      ],
    },
    {
      provide: ReorderWebsiteWallOfLoveItemsUseCase,
      useFactory: (
        clock: ClockPort,
        siteRepo: WebsiteSiteRepositoryPort,
        wallOfLoveRepo: WebsiteWallOfLoveRepositoryPort,
        wallOfLoveImagesRepo: WebsiteWallOfLoveImagesRepositoryPort
      ) =>
        new ReorderWebsiteWallOfLoveItemsUseCase({
          logger: new NestLoggerAdapter(),
          clock,
          siteRepo,
          wallOfLoveRepo,
          wallOfLoveImagesRepo,
        }),
      inject: [
        CLOCK_PORT_TOKEN,
        WEBSITE_SITE_REPO_PORT,
        WEBSITE_WALL_OF_LOVE_REPO_PORT,
        WEBSITE_WALL_OF_LOVE_IMAGES_REPO_PORT,
      ],
    },
    {
      provide: PublishWebsiteWallOfLoveItemUseCase,
      useFactory: (
        wallOfLoveRepo: WebsiteWallOfLoveRepositoryPort,
        wallOfLoveImagesRepo: WebsiteWallOfLoveImagesRepositoryPort,
        clock: ClockPort
      ) =>
        new PublishWebsiteWallOfLoveItemUseCase({
          logger: new NestLoggerAdapter(),
          wallOfLoveRepo,
          wallOfLoveImagesRepo,
          clock,
        }),
      inject: [
        WEBSITE_WALL_OF_LOVE_REPO_PORT,
        WEBSITE_WALL_OF_LOVE_IMAGES_REPO_PORT,
        CLOCK_PORT_TOKEN,
      ],
    },
    {
      provide: UnpublishWebsiteWallOfLoveItemUseCase,
      useFactory: (
        wallOfLoveRepo: WebsiteWallOfLoveRepositoryPort,
        wallOfLoveImagesRepo: WebsiteWallOfLoveImagesRepositoryPort,
        clock: ClockPort
      ) =>
        new UnpublishWebsiteWallOfLoveItemUseCase({
          logger: new NestLoggerAdapter(),
          wallOfLoveRepo,
          wallOfLoveImagesRepo,
          clock,
        }),
      inject: [
        WEBSITE_WALL_OF_LOVE_REPO_PORT,
        WEBSITE_WALL_OF_LOVE_IMAGES_REPO_PORT,
        CLOCK_PORT_TOKEN,
      ],
    },
    {
      provide: ListPublicWebsiteWallOfLoveItemsUseCase,
      useFactory: (
        wallOfLoveRepo: WebsiteWallOfLoveRepositoryPort,
        wallOfLoveImagesRepo: WebsiteWallOfLoveImagesRepositoryPort
      ) =>
        new ListPublicWebsiteWallOfLoveItemsUseCase({
          logger: new NestLoggerAdapter(),
          wallOfLoveRepo,
          wallOfLoveImagesRepo,
        }),
      inject: [WEBSITE_WALL_OF_LOVE_REPO_PORT, WEBSITE_WALL_OF_LOVE_IMAGES_REPO_PORT],
    },
    {
      provide: WebsiteSlugExistsUseCase,
      useFactory: (
        siteRepo: WebsiteSiteRepositoryPort,
        publicWorkspaceResolver: PublicWorkspaceResolver
      ) =>
        new WebsiteSlugExistsUseCase({
          logger: new NestLoggerAdapter(),
          siteRepo,
          publicWorkspaceResolver,
        }),
      inject: [WEBSITE_SITE_REPO_PORT, PublicWorkspaceResolver],
    },
    {
      provide: GenerateWebsitePageFromPromptUseCase,
      useFactory: (
        ai: WebsiteAiGeneratorPort,
        siteRepo: WebsiteSiteRepositoryPort,
        pageRepo: WebsitePageRepositoryPort,
        cmsWrite: CmsWritePort,
        idGenerator: IdGeneratorPort,
        clock: ClockPort,
        idempotencyStore: IdempotencyStoragePort
      ) =>
        new GenerateWebsitePageFromPromptUseCase({
          logger: new NestLoggerAdapter(),
          ai,
          siteRepo,
          pageRepo,
          cmsWrite,
          idGenerator,
          clock,
          idempotencyStore,
        }),
      inject: [
        WEBSITE_AI_PORT,
        WEBSITE_SITE_REPO_PORT,
        WEBSITE_PAGE_REPO_PORT,
        CMS_WRITE_PORT,
        ID_GENERATOR_TOKEN,
        CLOCK_PORT_TOKEN,
        IDEMPOTENCY_STORAGE_PORT_TOKEN,
      ],
    },
    {
      provide: WebsiteApplication,
      useFactory: (
        createSite: CreateWebsiteSiteUseCase,
        updateSite: UpdateWebsiteSiteUseCase,
        listSites: ListWebsiteSitesUseCase,
        getSite: GetWebsiteSiteUseCase,
        addDomain: AddWebsiteDomainUseCase,
        removeDomain: RemoveWebsiteDomainUseCase,
        listDomains: ListWebsiteDomainsUseCase,
        createPage: CreateWebsitePageUseCase,
        updatePage: UpdateWebsitePageUseCase,
        listPages: ListWebsitePagesUseCase,
        getPage: GetWebsitePageUseCase,
        publishPage: PublishWebsitePageUseCase,
        unpublishPage: UnpublishWebsitePageUseCase,
        upsertMenu: UpsertWebsiteMenuUseCase,
        listMenus: ListWebsiteMenusUseCase,
        resolvePublicPage: ResolveWebsitePublicPageUseCase,
        createFeedback: CreateWebsiteFeedbackUseCase,
        listPublicQa: ListWebsitePublicQaUseCase,
        listQa: ListWebsiteQaUseCase,
        createQa: CreateWebsiteQaUseCase,
        updateQa: UpdateWebsiteQaUseCase,
        deleteQa: DeleteWebsiteQaUseCase,
        listWallOfLoveItems: ListWebsiteWallOfLoveItemsUseCase,
        createWallOfLoveItem: CreateWebsiteWallOfLoveItemUseCase,
        updateWallOfLoveItem: UpdateWebsiteWallOfLoveItemUseCase,
        reorderWallOfLoveItems: ReorderWebsiteWallOfLoveItemsUseCase,
        publishWallOfLoveItem: PublishWebsiteWallOfLoveItemUseCase,
        unpublishWallOfLoveItem: UnpublishWebsiteWallOfLoveItemUseCase,
        listPublicWallOfLoveItems: ListPublicWebsiteWallOfLoveItemsUseCase,
        generatePageFromPrompt: GenerateWebsitePageFromPromptUseCase,
        slugExists: WebsiteSlugExistsUseCase
      ) =>
        new WebsiteApplication(
          createSite,
          updateSite,
          listSites,
          getSite,
          addDomain,
          removeDomain,
          listDomains,
          createPage,
          updatePage,
          listPages,
          getPage,
          publishPage,
          unpublishPage,
          upsertMenu,
          listMenus,
          resolvePublicPage,
          createFeedback,
          listPublicQa,
          listQa,
          createQa,
          updateQa,
          deleteQa,
          listWallOfLoveItems,
          createWallOfLoveItem,
          updateWallOfLoveItem,
          reorderWallOfLoveItems,
          publishWallOfLoveItem,
          unpublishWallOfLoveItem,
          listPublicWallOfLoveItems,
          generatePageFromPrompt,
          slugExists
        ),
      inject: [
        CreateWebsiteSiteUseCase,
        UpdateWebsiteSiteUseCase,
        ListWebsiteSitesUseCase,
        GetWebsiteSiteUseCase,
        AddWebsiteDomainUseCase,
        RemoveWebsiteDomainUseCase,
        ListWebsiteDomainsUseCase,
        CreateWebsitePageUseCase,
        UpdateWebsitePageUseCase,
        ListWebsitePagesUseCase,
        GetWebsitePageUseCase,
        PublishWebsitePageUseCase,
        UnpublishWebsitePageUseCase,
        UpsertWebsiteMenuUseCase,
        ListWebsiteMenusUseCase,
        ResolveWebsitePublicPageUseCase,
        CreateWebsiteFeedbackUseCase,
        ListWebsitePublicQaUseCase,
        ListWebsiteQaUseCase,
        CreateWebsiteQaUseCase,
        UpdateWebsiteQaUseCase,
        DeleteWebsiteQaUseCase,
        ListWebsiteWallOfLoveItemsUseCase,
        CreateWebsiteWallOfLoveItemUseCase,
        UpdateWebsiteWallOfLoveItemUseCase,
        ReorderWebsiteWallOfLoveItemsUseCase,
        PublishWebsiteWallOfLoveItemUseCase,
        UnpublishWebsiteWallOfLoveItemUseCase,
        ListPublicWebsiteWallOfLoveItemsUseCase,
        GenerateWebsitePageFromPromptUseCase,
        WebsiteSlugExistsUseCase,
      ],
    },
  ],
  exports: [WebsiteApplication],
})
export class WebsiteModule {}
