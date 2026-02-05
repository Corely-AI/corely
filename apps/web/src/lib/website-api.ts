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
  GetWebsitePageOutput,
  GetWebsiteSiteOutput,
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
}

export const websiteApi = new WebsiteApi();
