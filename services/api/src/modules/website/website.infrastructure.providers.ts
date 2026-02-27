import { type Provider } from "@nestjs/common";
import { EnvService } from "@corely/config";
import { PromptRegistry } from "@corely/prompts";
import { PromptUsageLogger } from "@/shared/prompts/prompt-usage.logger";
import { CmsApplication } from "@/modules/cms/application/cms.application";
import { DocumentsApplication } from "@/modules/documents/application/documents.application";
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
import { WEBSITE_SITE_REPO_PORT } from "./application/ports/site-repository.port";
import { WEBSITE_DOMAIN_REPO_PORT } from "./application/ports/domain-repository.port";
import { WEBSITE_PAGE_REPO_PORT } from "./application/ports/page-repository.port";
import { WEBSITE_MENU_REPO_PORT } from "./application/ports/menu-repository.port";
import { WEBSITE_SNAPSHOT_REPO_PORT } from "./application/ports/snapshot-repository.port";
import { WEBSITE_FEEDBACK_REPO_PORT } from "./application/ports/feedback-repository.port";
import { WEBSITE_QA_REPO_PORT } from "./application/ports/qa-repository.port";
import { WEBSITE_WALL_OF_LOVE_REPO_PORT } from "./application/ports/wall-of-love-repository.port";
import { WEBSITE_WALL_OF_LOVE_IMAGES_REPO_PORT } from "./application/ports/wall-of-love-images-repository.port";
import { WEBSITE_PUBLIC_FILE_URL_PORT } from "./application/ports/public-file-url.port";
import { CMS_READ_PORT } from "./application/ports/cms-read.port";
import { CMS_WRITE_PORT } from "./application/ports/cms-write.port";
import { WEBSITE_AI_PORT } from "./application/ports/website-ai.port";
import { WebsitePublicFileUrlPortAdapter } from "./infrastructure/documents/website-public-file-url.port.adapter";
import { CustomizationWebsiteCustomAttributesAdapter } from "./infrastructure/customization/customization-website-custom-attributes.adapter";
import { WEBSITE_CUSTOM_ATTRIBUTES_PORT } from "./application/ports/custom-attributes.port";

export const WEBSITE_INFRASTRUCTURE_PROVIDERS: Provider[] = [
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
    provide: WEBSITE_PUBLIC_FILE_URL_PORT,
    useFactory: (documents: DocumentsApplication) => new WebsitePublicFileUrlPortAdapter(documents),
    inject: [DocumentsApplication],
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
  CustomizationWebsiteCustomAttributesAdapter,
  {
    provide: WEBSITE_CUSTOM_ATTRIBUTES_PORT,
    useExisting: CustomizationWebsiteCustomAttributesAdapter,
  },
];
