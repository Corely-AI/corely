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
import type { GetWebsitePageContentUseCase } from "./use-cases/get-page-content.usecase";
import type { UpdateWebsitePageContentUseCase } from "./use-cases/update-page-content.usecase";
import type { PublishWebsitePageUseCase } from "./use-cases/publish-page.usecase";
import type { UnpublishWebsitePageUseCase } from "./use-cases/unpublish-page.usecase";
import type { UpsertWebsiteMenuUseCase } from "./use-cases/upsert-menu.usecase";
import type { ListWebsiteMenusUseCase } from "./use-cases/list-menus.usecase";
import type { ResolveWebsitePublicPageUseCase } from "./use-cases/resolve-public-page.usecase";
import type { ResolveWebsitePublicSiteSettingsUseCase } from "./use-cases/resolve-public-site-settings.usecase";
import type { GenerateWebsitePageFromPromptUseCase } from "./use-cases/generate-page-from-prompt.usecase";
import type { WebsiteSlugExistsUseCase } from "./use-cases/slug-exists.usecase";
import type { CreateWebsiteFeedbackUseCase } from "./use-cases/create-website-feedback.usecase";
import type { ListWebsitePublicQaUseCase } from "./use-cases/list-website-public-qa.usecase";
import type { ListWebsiteQaUseCase } from "./use-cases/list-website-qa.usecase";
import type { CreateWebsiteQaUseCase } from "./use-cases/create-website-qa.usecase";
import type { UpdateWebsiteQaUseCase } from "./use-cases/update-website-qa.usecase";
import type { DeleteWebsiteQaUseCase } from "./use-cases/delete-website-qa.usecase";
import type { ListWebsiteWallOfLoveItemsUseCase } from "./use-cases/list-website-wall-of-love-items.usecase";
import type { CreateWebsiteWallOfLoveItemUseCase } from "./use-cases/create-website-wall-of-love-item.usecase";
import type { UpdateWebsiteWallOfLoveItemUseCase } from "./use-cases/update-website-wall-of-love-item.usecase";
import type { ReorderWebsiteWallOfLoveItemsUseCase } from "./use-cases/reorder-website-wall-of-love-items.usecase";
import type { PublishWebsiteWallOfLoveItemUseCase } from "./use-cases/publish-website-wall-of-love-item.usecase";
import type { UnpublishWebsiteWallOfLoveItemUseCase } from "./use-cases/unpublish-website-wall-of-love-item.usecase";
import type { ListPublicWebsiteWallOfLoveItemsUseCase } from "./use-cases/list-public-website-wall-of-love-items.usecase";
import type { GenerateWebsiteBlocksUseCase } from "./use-cases/generate-blocks.usecase";
import type { RegenerateWebsiteBlockUseCase } from "./use-cases/regenerate-block.usecase";
import type { GetWebsiteExternalContentDraftUseCase } from "./use-cases/external-content/get-website-external-content-draft.usecase";
import type { PatchWebsiteExternalContentDraftUseCase } from "./use-cases/external-content/patch-website-external-content-draft.usecase";
import type { PublishWebsiteExternalContentUseCase } from "./use-cases/external-content/publish-website-external-content.usecase";
import type { GetPublicWebsiteExternalContentUseCase } from "./use-cases/external-content/get-public-website-external-content.usecase";

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
    public readonly getPageContent: GetWebsitePageContentUseCase,
    public readonly updatePageContent: UpdateWebsitePageContentUseCase,
    public readonly publishPage: PublishWebsitePageUseCase,
    public readonly unpublishPage: UnpublishWebsitePageUseCase,
    public readonly upsertMenu: UpsertWebsiteMenuUseCase,
    public readonly listMenus: ListWebsiteMenusUseCase,
    public readonly resolvePublicPage: ResolveWebsitePublicPageUseCase,
    public readonly resolvePublicSiteSettings: ResolveWebsitePublicSiteSettingsUseCase,
    public readonly createFeedback: CreateWebsiteFeedbackUseCase,
    public readonly listPublicQa: ListWebsitePublicQaUseCase,
    public readonly listQa: ListWebsiteQaUseCase,
    public readonly createQa: CreateWebsiteQaUseCase,
    public readonly updateQa: UpdateWebsiteQaUseCase,
    public readonly deleteQa: DeleteWebsiteQaUseCase,
    public readonly listWallOfLoveItems: ListWebsiteWallOfLoveItemsUseCase,
    public readonly createWallOfLoveItem: CreateWebsiteWallOfLoveItemUseCase,
    public readonly updateWallOfLoveItem: UpdateWebsiteWallOfLoveItemUseCase,
    public readonly reorderWallOfLoveItems: ReorderWebsiteWallOfLoveItemsUseCase,
    public readonly publishWallOfLoveItem: PublishWebsiteWallOfLoveItemUseCase,
    public readonly unpublishWallOfLoveItem: UnpublishWebsiteWallOfLoveItemUseCase,
    public readonly listPublicWallOfLoveItems: ListPublicWebsiteWallOfLoveItemsUseCase,
    public readonly generateBlocks: GenerateWebsiteBlocksUseCase,
    public readonly regenerateBlock: RegenerateWebsiteBlockUseCase,
    public readonly getExternalContentDraft: GetWebsiteExternalContentDraftUseCase,
    public readonly patchExternalContentDraft: PatchWebsiteExternalContentDraftUseCase,
    public readonly publishExternalContent: PublishWebsiteExternalContentUseCase,
    public readonly getPublicExternalContent: GetPublicWebsiteExternalContentUseCase,
    public readonly generatePageFromPrompt: GenerateWebsitePageFromPromptUseCase,
    public readonly slugExists: WebsiteSlugExistsUseCase
  ) {}
}
