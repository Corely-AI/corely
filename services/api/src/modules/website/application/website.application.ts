import type { CreateWebsiteSiteUseCase } from "./use-cases/create-site.usecase";
import type { UpdateWebsiteSiteUseCase } from "./use-cases/update-site.usecase";
import type { ListWebsiteSitesUseCase } from "./use-cases/list-sites.usecase";
import type { GetWebsiteSiteUseCase } from "./use-cases/get-site.usecase";
import type { AddWebsiteDomainUseCase } from "./use-cases/add-domain.usecase";
import type { RemoveWebsiteDomainUseCase } from "./use-cases/remove-domain.usecase";
import type { ListWebsiteDomainsUseCase } from "./use-cases/list-domains.usecase";
import type { CreateWebsitePageUseCase } from "./use-cases/create-page.usecase";
import type { UpdateWebsitePageUseCase } from "./use-cases/update-page.usecase";
import type { ListWebsitePagesUseCase } from "./use-cases/list-pages.usecase";
import type { GetWebsitePageUseCase } from "./use-cases/get-page.usecase";
import type { PublishWebsitePageUseCase } from "./use-cases/publish-page.usecase";
import type { UnpublishWebsitePageUseCase } from "./use-cases/unpublish-page.usecase";
import type { UpsertWebsiteMenuUseCase } from "./use-cases/upsert-menu.usecase";
import type { ListWebsiteMenusUseCase } from "./use-cases/list-menus.usecase";
import type { ResolveWebsitePublicPageUseCase } from "./use-cases/resolve-public-page.usecase";
import type { GenerateWebsitePageFromPromptUseCase } from "./use-cases/generate-page-from-prompt.usecase";

export class WebsiteApplication {
  constructor(
    public readonly createSite: CreateWebsiteSiteUseCase,
    public readonly updateSite: UpdateWebsiteSiteUseCase,
    public readonly listSites: ListWebsiteSitesUseCase,
    public readonly getSite: GetWebsiteSiteUseCase,
    public readonly addDomain: AddWebsiteDomainUseCase,
    public readonly removeDomain: RemoveWebsiteDomainUseCase,
    public readonly listDomains: ListWebsiteDomainsUseCase,
    public readonly createPage: CreateWebsitePageUseCase,
    public readonly updatePage: UpdateWebsitePageUseCase,
    public readonly listPages: ListWebsitePagesUseCase,
    public readonly getPage: GetWebsitePageUseCase,
    public readonly publishPage: PublishWebsitePageUseCase,
    public readonly unpublishPage: UnpublishWebsitePageUseCase,
    public readonly upsertMenu: UpsertWebsiteMenuUseCase,
    public readonly listMenus: ListWebsiteMenusUseCase,
    public readonly resolvePublicPage: ResolveWebsitePublicPageUseCase,
    public readonly generatePageFromPrompt: GenerateWebsitePageFromPromptUseCase
  ) {}
}
