import type {
  CreateWebsiteSiteInput,
  UpdateWebsiteSiteInput,
  WebsiteSite,
  ListWebsiteSitesInput,
  ListWebsiteSitesOutput,
  AddWebsiteDomainInput,
  WebsiteDomain,
  ListWebsiteDomainsOutput,
  CreateWebsitePageInput,
  UpdateWebsitePageInput,
  WebsitePage,
  ListWebsitePagesInput,
  ListWebsitePagesOutput,
  PublishWebsitePageOutput,
  UnpublishWebsitePageOutput,
  UpsertWebsiteMenuInput,
  UpsertWebsiteMenuOutput,
  ListWebsiteMenusOutput,
  GenerateWebsitePageInput,
  GenerateWebsitePageOutput,
  GenerateWebsiteBlocksInput,
  GenerateWebsiteBlocksOutput,
  RegenerateWebsiteBlockInput,
  RegenerateWebsiteBlockOutput,
  GetWebsitePageOutput,
  GetWebsitePageContentOutput,
  UpdateWebsitePageContentInput,
  UpdateWebsitePageContentOutput,
  GetWebsiteSiteOutput,
  CreateWebsiteQaInput,
  ListWebsiteQaAdminOutput,
  UpdateWebsiteQaInput,
  UpsertWebsiteQaOutput,
  CreateWebsiteWallOfLoveItemInput,
  ListWebsiteWallOfLoveItemsOutput,
  UpdateWebsiteWallOfLoveItemInput,
  WebsiteWallOfLoveUpsertOutput,
  GetWebsiteExternalContentDraftInput,
  PatchWebsiteExternalContentDraftInput,
  PublishWebsiteExternalContentInput,
  WebsiteExternalContentOutput,
} from "@corely/contracts";
import { apiClient } from "./api-client";

export class WebsiteApi {
  async listSites(params?: ListWebsiteSitesInput): Promise<ListWebsiteSitesOutput> {
    const query = new URLSearchParams();
    if (params?.q) {
      query.append("q", params.q);
    }
    if (params?.page) {
      query.append("page", String(params.page));
    }
    if (params?.pageSize) {
      query.append("pageSize", String(params.pageSize));
    }
    if (params?.sort) {
      query.append("sort", Array.isArray(params.sort) ? params.sort[0] : params.sort);
    }

    const endpoint = query.toString() ? `/website/sites?${query.toString()}` : "/website/sites";
    return apiClient.get<ListWebsiteSitesOutput>(endpoint, {
      correlationId: apiClient.generateCorrelationId(),
    });
  }

  async getSite(siteId: string): Promise<GetWebsiteSiteOutput> {
    return apiClient.get<GetWebsiteSiteOutput>(`/website/sites/${siteId}`, {
      correlationId: apiClient.generateCorrelationId(),
    });
  }

  async createSite(input: CreateWebsiteSiteInput): Promise<WebsiteSite> {
    return apiClient.post<WebsiteSite>("/website/sites", input, {
      idempotencyKey: apiClient.generateIdempotencyKey(),
      correlationId: apiClient.generateCorrelationId(),
    });
  }

  async updateSite(siteId: string, input: UpdateWebsiteSiteInput): Promise<WebsiteSite> {
    return apiClient.put<WebsiteSite>(`/website/sites/${siteId}`, input, {
      idempotencyKey: apiClient.generateIdempotencyKey(),
      correlationId: apiClient.generateCorrelationId(),
    });
  }

  async listDomains(siteId: string): Promise<ListWebsiteDomainsOutput> {
    return apiClient.get<ListWebsiteDomainsOutput>(`/website/sites/${siteId}/domains`, {
      correlationId: apiClient.generateCorrelationId(),
    });
  }

  async addDomain(siteId: string, input: AddWebsiteDomainInput): Promise<WebsiteDomain> {
    return apiClient.post<WebsiteDomain>(`/website/sites/${siteId}/domains`, input, {
      idempotencyKey: apiClient.generateIdempotencyKey(),
      correlationId: apiClient.generateCorrelationId(),
    });
  }

  async removeDomain(siteId: string, domainId: string): Promise<void> {
    return apiClient.delete(`/website/sites/${siteId}/domains/${domainId}`, {
      correlationId: apiClient.generateCorrelationId(),
    });
  }

  async listPages(siteId: string, params?: ListWebsitePagesInput): Promise<ListWebsitePagesOutput> {
    const query = new URLSearchParams();
    if (params?.q) {
      query.append("q", params.q);
    }
    if (params?.page) {
      query.append("page", String(params.page));
    }
    if (params?.pageSize) {
      query.append("pageSize", String(params.pageSize));
    }
    if (params?.status) {
      query.append("status", params.status);
    }
    if (params?.sort) {
      query.append("sort", Array.isArray(params.sort) ? params.sort[0] : params.sort);
    }

    const endpoint = query.toString()
      ? `/website/sites/${siteId}/pages?${query.toString()}`
      : `/website/sites/${siteId}/pages`;

    return apiClient.get<ListWebsitePagesOutput>(endpoint, {
      correlationId: apiClient.generateCorrelationId(),
    });
  }

  async getPage(pageId: string): Promise<GetWebsitePageOutput> {
    return apiClient.get<GetWebsitePageOutput>(`/website/pages/${pageId}`, {
      correlationId: apiClient.generateCorrelationId(),
    });
  }

  async getPageContent(pageId: string): Promise<GetWebsitePageContentOutput> {
    return apiClient.get<GetWebsitePageContentOutput>(`/website/pages/${pageId}/content`, {
      correlationId: apiClient.generateCorrelationId(),
    });
  }

  async createPage(siteId: string, input: CreateWebsitePageInput): Promise<WebsitePage> {
    return apiClient.post<WebsitePage>(
      `/website/sites/${siteId}/pages`,
      { ...input, siteId },
      {
        idempotencyKey: apiClient.generateIdempotencyKey(),
        correlationId: apiClient.generateCorrelationId(),
      }
    );
  }

  async updatePage(pageId: string, input: UpdateWebsitePageInput): Promise<WebsitePage> {
    return apiClient.put<WebsitePage>(`/website/pages/${pageId}`, input, {
      idempotencyKey: apiClient.generateIdempotencyKey(),
      correlationId: apiClient.generateCorrelationId(),
    });
  }

  async updatePageContent(
    pageId: string,
    input: UpdateWebsitePageContentInput
  ): Promise<UpdateWebsitePageContentOutput> {
    return apiClient.patch<UpdateWebsitePageContentOutput>(
      `/website/pages/${pageId}/content`,
      input,
      {
        idempotencyKey: apiClient.generateIdempotencyKey(),
        correlationId: apiClient.generateCorrelationId(),
      }
    );
  }

  async publishPage(pageId: string): Promise<PublishWebsitePageOutput> {
    return apiClient.post<PublishWebsitePageOutput>(
      `/website/pages/${pageId}/publish`,
      {},
      {
        idempotencyKey: apiClient.generateIdempotencyKey(),
        correlationId: apiClient.generateCorrelationId(),
      }
    );
  }

  async unpublishPage(pageId: string): Promise<UnpublishWebsitePageOutput> {
    return apiClient.post<UnpublishWebsitePageOutput>(
      `/website/pages/${pageId}/unpublish`,
      {},
      {
        idempotencyKey: apiClient.generateIdempotencyKey(),
        correlationId: apiClient.generateCorrelationId(),
      }
    );
  }

  async listMenus(siteId: string): Promise<ListWebsiteMenusOutput> {
    return apiClient.get<ListWebsiteMenusOutput>(`/website/sites/${siteId}/menus`, {
      correlationId: apiClient.generateCorrelationId(),
    });
  }

  async upsertMenu(
    siteId: string,
    input: UpsertWebsiteMenuInput
  ): Promise<UpsertWebsiteMenuOutput> {
    return apiClient.put<UpsertWebsiteMenuOutput>(`/website/sites/${siteId}/menus`, input, {
      idempotencyKey: apiClient.generateIdempotencyKey(),
      correlationId: apiClient.generateCorrelationId(),
    });
  }

  async generatePage(input: GenerateWebsitePageInput): Promise<GenerateWebsitePageOutput> {
    return apiClient.post<GenerateWebsitePageOutput>("/website/ai/generate-page", input, {
      idempotencyKey: apiClient.generateIdempotencyKey(),
      correlationId: apiClient.generateCorrelationId(),
    });
  }

  async generateBlocks(input: GenerateWebsiteBlocksInput): Promise<GenerateWebsiteBlocksOutput> {
    return apiClient.post<GenerateWebsiteBlocksOutput>("/website/ai/generate-blocks", input, {
      idempotencyKey: apiClient.generateIdempotencyKey(),
      correlationId: apiClient.generateCorrelationId(),
    });
  }

  async regenerateBlock(input: RegenerateWebsiteBlockInput): Promise<RegenerateWebsiteBlockOutput> {
    return apiClient.post<RegenerateWebsiteBlockOutput>("/website/ai/regenerate-block", input, {
      idempotencyKey: apiClient.generateIdempotencyKey(),
      correlationId: apiClient.generateCorrelationId(),
    });
  }

  async listQa(
    siteId: string,
    params?: { locale?: string; scope?: "site" | "page"; status?: "draft" | "published" }
  ): Promise<ListWebsiteQaAdminOutput> {
    const query = new URLSearchParams();
    if (params?.locale) {
      query.append("locale", params.locale);
    }
    if (params?.scope) {
      query.append("scope", params.scope);
    }
    if (params?.status) {
      query.append("status", params.status);
    }
    const endpoint = query.toString()
      ? `/website/sites/${siteId}/qa?${query.toString()}`
      : `/website/sites/${siteId}/qa`;
    return apiClient.get<ListWebsiteQaAdminOutput>(endpoint, {
      correlationId: apiClient.generateCorrelationId(),
    });
  }

  async createQa(siteId: string, input: CreateWebsiteQaInput): Promise<UpsertWebsiteQaOutput> {
    return apiClient.post<UpsertWebsiteQaOutput>(
      `/website/sites/${siteId}/qa`,
      { ...input, siteId },
      {
        idempotencyKey: apiClient.generateIdempotencyKey(),
        correlationId: apiClient.generateCorrelationId(),
      }
    );
  }

  async updateQa(
    siteId: string,
    qaId: string,
    input: UpdateWebsiteQaInput
  ): Promise<UpsertWebsiteQaOutput> {
    return apiClient.put<UpsertWebsiteQaOutput>(`/website/sites/${siteId}/qa/${qaId}`, input, {
      idempotencyKey: apiClient.generateIdempotencyKey(),
      correlationId: apiClient.generateCorrelationId(),
    });
  }

  async deleteQa(siteId: string, qaId: string): Promise<void> {
    await apiClient.delete(`/website/sites/${siteId}/qa/${qaId}`, {
      correlationId: apiClient.generateCorrelationId(),
    });
  }

  async listWallOfLoveItems(siteId: string): Promise<ListWebsiteWallOfLoveItemsOutput> {
    return apiClient.get<ListWebsiteWallOfLoveItemsOutput>(
      `/website/sites/${siteId}/wall-of-love/items`,
      {
        correlationId: apiClient.generateCorrelationId(),
      }
    );
  }

  async createWallOfLoveItem(
    siteId: string,
    input: Omit<CreateWebsiteWallOfLoveItemInput, "siteId">
  ): Promise<WebsiteWallOfLoveUpsertOutput> {
    return apiClient.post<WebsiteWallOfLoveUpsertOutput>(
      `/website/sites/${siteId}/wall-of-love/items`,
      { ...input, siteId },
      {
        idempotencyKey: apiClient.generateIdempotencyKey(),
        correlationId: apiClient.generateCorrelationId(),
      }
    );
  }

  async updateWallOfLoveItem(
    itemId: string,
    input: UpdateWebsiteWallOfLoveItemInput
  ): Promise<WebsiteWallOfLoveUpsertOutput> {
    return apiClient.patch<WebsiteWallOfLoveUpsertOutput>(
      `/website/wall-of-love/items/${itemId}`,
      input,
      {
        idempotencyKey: apiClient.generateIdempotencyKey(),
        correlationId: apiClient.generateCorrelationId(),
      }
    );
  }

  async publishWallOfLoveItem(itemId: string): Promise<WebsiteWallOfLoveUpsertOutput> {
    return apiClient.post<WebsiteWallOfLoveUpsertOutput>(
      `/website/wall-of-love/items/${itemId}/publish`,
      {},
      {
        idempotencyKey: apiClient.generateIdempotencyKey(),
        correlationId: apiClient.generateCorrelationId(),
      }
    );
  }

  async unpublishWallOfLoveItem(itemId: string): Promise<WebsiteWallOfLoveUpsertOutput> {
    return apiClient.post<WebsiteWallOfLoveUpsertOutput>(
      `/website/wall-of-love/items/${itemId}/unpublish`,
      {},
      {
        idempotencyKey: apiClient.generateIdempotencyKey(),
        correlationId: apiClient.generateCorrelationId(),
      }
    );
  }

  async reorderWallOfLoveItems(
    siteId: string,
    orderedIds: string[]
  ): Promise<ListWebsiteWallOfLoveItemsOutput> {
    return apiClient.post<ListWebsiteWallOfLoveItemsOutput>(
      `/website/sites/${siteId}/wall-of-love/items/reorder`,
      { siteId, orderedIds },
      {
        idempotencyKey: apiClient.generateIdempotencyKey(),
        correlationId: apiClient.generateCorrelationId(),
      }
    );
  }

  async getExternalContentDraft(
    siteId: string,
    input: GetWebsiteExternalContentDraftInput
  ): Promise<WebsiteExternalContentOutput> {
    const query = new URLSearchParams();
    query.append("key", input.key);
    if (input.locale) {
      query.append("locale", input.locale);
    }

    return apiClient.get<WebsiteExternalContentOutput>(
      `/website/sites/${siteId}/external-content/draft?${query.toString()}`,
      {
        correlationId: apiClient.generateCorrelationId(),
      }
    );
  }

  async patchExternalContentDraft(
    siteId: string,
    input: PatchWebsiteExternalContentDraftInput
  ): Promise<WebsiteExternalContentOutput> {
    return apiClient.patch<WebsiteExternalContentOutput>(
      `/website/sites/${siteId}/external-content/draft`,
      input,
      {
        idempotencyKey: apiClient.generateIdempotencyKey(),
        correlationId: apiClient.generateCorrelationId(),
      }
    );
  }

  async publishExternalContent(
    siteId: string,
    input: PublishWebsiteExternalContentInput
  ): Promise<WebsiteExternalContentOutput> {
    return apiClient.post<WebsiteExternalContentOutput>(
      `/website/sites/${siteId}/external-content/publish`,
      input,
      {
        idempotencyKey: apiClient.generateIdempotencyKey(),
        correlationId: apiClient.generateCorrelationId(),
      }
    );
  }
}

export const websiteApi = new WebsiteApi();
