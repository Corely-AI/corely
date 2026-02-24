import { type Provider } from "@nestjs/common";
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
import { ListWebsiteWallOfLoveItemsUseCase } from "./application/use-cases/list-website-wall-of-love-items.usecase";
import { CreateWebsiteWallOfLoveItemUseCase } from "./application/use-cases/create-website-wall-of-love-item.usecase";
import { UpdateWebsiteWallOfLoveItemUseCase } from "./application/use-cases/update-website-wall-of-love-item.usecase";
import { ReorderWebsiteWallOfLoveItemsUseCase } from "./application/use-cases/reorder-website-wall-of-love-items.usecase";
import { PublishWebsiteWallOfLoveItemUseCase } from "./application/use-cases/publish-website-wall-of-love-item.usecase";
import { UnpublishWebsiteWallOfLoveItemUseCase } from "./application/use-cases/unpublish-website-wall-of-love-item.usecase";
import { ListPublicWebsiteWallOfLoveItemsUseCase } from "./application/use-cases/list-public-website-wall-of-love-items.usecase";
import { GenerateWebsitePageFromPromptUseCase } from "./application/use-cases/generate-page-from-prompt.usecase";
import { WebsiteSlugExistsUseCase } from "./application/use-cases/slug-exists.usecase";
import { GenerateWebsiteBlocksUseCase } from "./application/use-cases/generate-blocks.usecase";
import { RegenerateWebsiteBlockUseCase } from "./application/use-cases/regenerate-block.usecase";
import { GetWebsiteExternalContentDraftUseCase } from "./application/use-cases/external-content/get-website-external-content-draft.usecase";
import { PatchWebsiteExternalContentDraftUseCase } from "./application/use-cases/external-content/patch-website-external-content-draft.usecase";
import { PublishWebsiteExternalContentUseCase } from "./application/use-cases/external-content/publish-website-external-content.usecase";
import { GetPublicWebsiteExternalContentUseCase } from "./application/use-cases/external-content/get-public-website-external-content.usecase";

export const WEBSITE_APPLICATION_PROVIDER: Provider = {
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
    getPageContent: GetWebsitePageContentUseCase,
    updatePageContent: UpdateWebsitePageContentUseCase,
    publishPage: PublishWebsitePageUseCase,
    unpublishPage: UnpublishWebsitePageUseCase,
    upsertMenu: UpsertWebsiteMenuUseCase,
    listMenus: ListWebsiteMenusUseCase,
    resolvePublicPage: ResolveWebsitePublicPageUseCase,
    resolvePublicSiteSettings: ResolveWebsitePublicSiteSettingsUseCase,
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
    generateBlocks: GenerateWebsiteBlocksUseCase,
    regenerateBlock: RegenerateWebsiteBlockUseCase,
    getExternalContentDraft: GetWebsiteExternalContentDraftUseCase,
    patchExternalContentDraft: PatchWebsiteExternalContentDraftUseCase,
    publishExternalContent: PublishWebsiteExternalContentUseCase,
    getPublicExternalContent: GetPublicWebsiteExternalContentUseCase,
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
      getPageContent,
      updatePageContent,
      publishPage,
      unpublishPage,
      upsertMenu,
      listMenus,
      resolvePublicPage,
      resolvePublicSiteSettings,
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
      generateBlocks,
      regenerateBlock,
      getExternalContentDraft,
      patchExternalContentDraft,
      publishExternalContent,
      getPublicExternalContent,
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
    GetWebsitePageContentUseCase,
    UpdateWebsitePageContentUseCase,
    PublishWebsitePageUseCase,
    UnpublishWebsitePageUseCase,
    UpsertWebsiteMenuUseCase,
    ListWebsiteMenusUseCase,
    ResolveWebsitePublicPageUseCase,
    ResolveWebsitePublicSiteSettingsUseCase,
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
    GenerateWebsiteBlocksUseCase,
    RegenerateWebsiteBlockUseCase,
    GetWebsiteExternalContentDraftUseCase,
    PatchWebsiteExternalContentDraftUseCase,
    PublishWebsiteExternalContentUseCase,
    GetPublicWebsiteExternalContentUseCase,
    GenerateWebsitePageFromPromptUseCase,
    WebsiteSlugExistsUseCase,
  ],
};
