import { type Provider } from "@nestjs/common";
import { NestLoggerAdapter } from "@/shared/adapters/logger/nest-logger.adapter";
import { ID_GENERATOR_TOKEN, type IdGeneratorPort } from "@/shared/ports/id-generator.port";
import { CLOCK_PORT_TOKEN, type ClockPort } from "@/shared/ports/clock.port";
import {
  IDEMPOTENCY_STORAGE_PORT_TOKEN,
  type IdempotencyStoragePort,
} from "@/shared/ports/idempotency-storage.port";
import { PublicWorkspaceResolver } from "@/shared/public";
import { ListWebsiteWallOfLoveItemsUseCase } from "./application/use-cases/list-website-wall-of-love-items.usecase";
import { CreateWebsiteWallOfLoveItemUseCase } from "./application/use-cases/create-website-wall-of-love-item.usecase";
import { UpdateWebsiteWallOfLoveItemUseCase } from "./application/use-cases/update-website-wall-of-love-item.usecase";
import { ReorderWebsiteWallOfLoveItemsUseCase } from "./application/use-cases/reorder-website-wall-of-love-items.usecase";
import { PublishWebsiteWallOfLoveItemUseCase } from "./application/use-cases/publish-website-wall-of-love-item.usecase";
import { UnpublishWebsiteWallOfLoveItemUseCase } from "./application/use-cases/unpublish-website-wall-of-love-item.usecase";
import { ListPublicWebsiteWallOfLoveItemsUseCase } from "./application/use-cases/list-public-website-wall-of-love-items.usecase";
import { WebsiteSlugExistsUseCase } from "./application/use-cases/slug-exists.usecase";
import { GenerateWebsitePageFromPromptUseCase } from "./application/use-cases/generate-page-from-prompt.usecase";
import { GenerateWebsiteBlocksUseCase } from "./application/use-cases/generate-blocks.usecase";
import { RegenerateWebsiteBlockUseCase } from "./application/use-cases/regenerate-block.usecase";
import {
  WEBSITE_SITE_REPO_PORT,
  type WebsiteSiteRepositoryPort,
} from "./application/ports/site-repository.port";
import {
  WEBSITE_WALL_OF_LOVE_REPO_PORT,
  type WebsiteWallOfLoveRepositoryPort,
} from "./application/ports/wall-of-love-repository.port";
import {
  WEBSITE_WALL_OF_LOVE_IMAGES_REPO_PORT,
  type WebsiteWallOfLoveImagesRepositoryPort,
} from "./application/ports/wall-of-love-images-repository.port";
import {
  WEBSITE_PUBLIC_FILE_URL_PORT,
  type WebsitePublicFileUrlPort,
} from "./application/ports/public-file-url.port";
import { WEBSITE_AI_PORT, type WebsiteAiGeneratorPort } from "./application/ports/website-ai.port";
import { CMS_WRITE_PORT, type CmsWritePort } from "./application/ports/cms-write.port";
import {
  WEBSITE_PAGE_REPO_PORT,
  type WebsitePageRepositoryPort,
} from "./application/ports/page-repository.port";

export const WEBSITE_WALL_OF_LOVE_USE_CASE_PROVIDERS: Provider[] = [
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
      wallOfLoveImagesRepo: WebsiteWallOfLoveImagesRepositoryPort,
      publicFileUrlPort: WebsitePublicFileUrlPort
    ) =>
      new ListPublicWebsiteWallOfLoveItemsUseCase({
        logger: new NestLoggerAdapter(),
        wallOfLoveRepo,
        wallOfLoveImagesRepo,
        publicFileUrlPort,
      }),
    inject: [
      WEBSITE_WALL_OF_LOVE_REPO_PORT,
      WEBSITE_WALL_OF_LOVE_IMAGES_REPO_PORT,
      WEBSITE_PUBLIC_FILE_URL_PORT,
    ],
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
    provide: GenerateWebsiteBlocksUseCase,
    useFactory: () =>
      new GenerateWebsiteBlocksUseCase({
        logger: new NestLoggerAdapter(),
      }),
    inject: [],
  },
  {
    provide: RegenerateWebsiteBlockUseCase,
    useFactory: () =>
      new RegenerateWebsiteBlockUseCase({
        logger: new NestLoggerAdapter(),
      }),
    inject: [],
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
];
