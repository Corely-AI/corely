import { Module } from "@nestjs/common";
import { DataModule } from "@corely/data";
import { KernelModule } from "@/shared/kernel/kernel.module";
import { IdentityModule } from "@/modules/identity";
import { DocumentsModule } from "@/modules/documents/documents.module";
import { PromptModule } from "@/shared/prompts/prompt.module";
import { CmsModule } from "@/modules/cms";
import { CustomizationModule } from "@/modules/customization/customization.module";
import { PublicWorkspaceResolver } from "@/shared/public";
import { WebsiteSitesController } from "./adapters/http/website-sites.controller";
import { WebsiteDomainsController } from "./adapters/http/website-domains.controller";
import { WebsitePagesController } from "./adapters/http/website-pages.controller";
import { WebsiteMenusController } from "./adapters/http/website-menus.controller";
import { WebsiteQaController } from "./adapters/http/website-qa.controller";
import { WebsiteWallOfLoveController } from "./adapters/http/website-wall-of-love.controller";
import { WebsitePublicController } from "./adapters/http/website-public.controller";
import { WebsiteAiController } from "./adapters/http/website-ai.controller";
import { WebsiteExternalContentController } from "./adapters/http/website-external-content.controller";
import { WebsiteApplication } from "./application/website.application";
import { WEBSITE_INFRASTRUCTURE_PROVIDERS } from "./website.infrastructure.providers";
import { WEBSITE_USE_CASE_PROVIDERS } from "./website.usecase.providers";
import { WEBSITE_WALL_OF_LOVE_USE_CASE_PROVIDERS } from "./website.wall-of-love.providers";
import { WEBSITE_EXTERNAL_CONTENT_USE_CASE_PROVIDERS } from "./website.external-content.providers";
import { WEBSITE_APPLICATION_PROVIDER } from "./website.application.provider";

@Module({
  imports: [
    DataModule,
    KernelModule,
    IdentityModule,
    DocumentsModule,
    PromptModule,
    CmsModule,
    CustomizationModule,
  ],
  controllers: [
    WebsiteSitesController,
    WebsiteDomainsController,
    WebsitePagesController,
    WebsiteMenusController,
    WebsiteQaController,
    WebsiteWallOfLoveController,
    WebsitePublicController,
    WebsiteAiController,
    WebsiteExternalContentController,
  ],
  providers: [
    PublicWorkspaceResolver,
    ...WEBSITE_INFRASTRUCTURE_PROVIDERS,
    ...WEBSITE_USE_CASE_PROVIDERS,
    ...WEBSITE_WALL_OF_LOVE_USE_CASE_PROVIDERS,
    ...WEBSITE_EXTERNAL_CONTENT_USE_CASE_PROVIDERS,
    WEBSITE_APPLICATION_PROVIDER,
  ],
  exports: [WebsiteApplication],
})
export class WebsiteModule {}
