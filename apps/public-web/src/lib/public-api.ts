import { request } from "@corely/api-client";
import {
  CheckAvailabilityOutputSchema,
  CreateWebsiteFeedbackInputSchema,
  CreateWebsiteFeedbackOutputSchema,
  GetRentalContactSettingsOutputSchema,
  GetPublicCmsPostOutputSchema,
  ListWebsiteQaInputSchema,
  ListWebsiteQaOutputSchema,
  ListPublicWebsiteWallOfLoveItemsInputSchema,
  ListPublicWebsiteWallOfLoveItemsOutputSchema,
  ListPublicCmsPostsOutputSchema,
  GetPublicRentalPropertyOutputSchema,
  ListPublicRentalPropertiesOutputSchema,
  ListRentalCategoriesOutputSchema,
  PublicSubmitInputSchema,
  PublicSubmitOutputSchema,
  PublicPortfolioShowcaseListInputSchema,
  PublicPortfolioShowcaseOutputSchema,
  PublicPortfolioShowcasesOutputSchema,
  PublicPortfolioProjectsOutputSchema,
  PublicPortfolioProjectOutputSchema,
  ResolveWebsitePublicInputSchema,
  ResolveWebsitePublicOutputSchema,
  WebsiteSlugExistsOutputSchema,
} from "@corely/contracts";
import { withQuery } from "./urls";
import { buildPublicFileUrl, resolvePublicApiBaseUrl } from "./public-api-base";

export { buildPublicFileUrl, resolvePublicApiBaseUrl };

const buildUrl = (
  path: string,
  params?: Record<string, string | number | boolean | undefined>,
  workspaceSlug?: string | null
) => {
  const prefix = workspaceSlug ? `/w/${workspaceSlug}` : "";
  const baseUrl = resolvePublicApiBaseUrl().replace(/\/$/, "");
  return withQuery(`${baseUrl}${prefix}${path}`, params);
};

export const publicApi = {
  async listPortfolioShowcases(input: {
    q?: string;
    type?: "individual" | "company" | "hybrid";
    page?: number;
    pageSize?: number;
    workspaceSlug?: string | null;
  }) {
    const { workspaceSlug, ...query } = input;
    const parsed = PublicPortfolioShowcaseListInputSchema.parse(query);
    const url = buildUrl(
      "/public/portfolio",
      {
        q: parsed.q,
        type: parsed.type,
        page: parsed.page,
        pageSize: parsed.pageSize,
      },
      workspaceSlug
    );
    const data = await request({ url });
    return PublicPortfolioShowcasesOutputSchema.parse(data);
  },

  async getPortfolioShowcase(slug: string, workspaceSlug?: string | null) {
    const url = buildUrl(`/public/portfolio/${slug}`, undefined, workspaceSlug);
    const data = await request({ url });
    return PublicPortfolioShowcaseOutputSchema.parse(data);
  },

  async listPortfolioProjects(showcaseSlug: string, workspaceSlug?: string | null) {
    const url = buildUrl(
      `/public/portfolio/showcases/${showcaseSlug}/projects`,
      undefined,
      workspaceSlug
    );
    const data = await request({ url });
    return PublicPortfolioProjectsOutputSchema.parse(data);
  },

  async getPortfolioProject(
    showcaseSlug: string,
    projectSlug: string,
    workspaceSlug?: string | null
  ) {
    const url = buildUrl(
      `/public/portfolio/showcases/${showcaseSlug}/projects/${projectSlug}`,
      undefined,
      workspaceSlug
    );
    const data = await request({ url });
    return PublicPortfolioProjectOutputSchema.parse(data);
  },

  async listRentals(input: { q?: string; categorySlug?: string; workspaceSlug?: string | null }) {
    const url = buildUrl(
      "/public/rentals/properties",
      { q: input.q, categorySlug: input.categorySlug },
      input.workspaceSlug
    );
    const data = await request({ url });
    return ListPublicRentalPropertiesOutputSchema.parse(data);
  },

  async getRentalProperty(slug: string, workspaceSlug?: string | null) {
    const url = buildUrl(`/public/rentals/properties/${slug}`, undefined, workspaceSlug);
    const data = await request({ url });
    return GetPublicRentalPropertyOutputSchema.parse(data);
  },

  async listRentalCategories(workspaceSlug?: string | null) {
    const url = buildUrl("/public/rentals/categories", undefined, workspaceSlug);
    const data = await request({ url });
    return ListRentalCategoriesOutputSchema.parse(data);
  },

  async checkRentalAvailability(input: {
    propertySlug: string;
    from: string;
    to: string;
    workspaceSlug?: string | null;
  }) {
    const url = buildUrl(
      `/public/rentals/properties/${input.propertySlug}/availability`,
      { from: input.from, to: input.to },
      input.workspaceSlug
    );
    const data = await request({ url });
    return CheckAvailabilityOutputSchema.parse(data);
  },

  async getRentalSettings(workspaceSlug?: string | null) {
    const url = buildUrl("/public/rentals/settings", undefined, workspaceSlug);
    const data = await request({ url });
    return GetRentalContactSettingsOutputSchema.parse(data);
  },

  async listBlogPosts(input: {
    q?: string;
    page?: number;
    pageSize?: number;
    workspaceSlug?: string | null;
  }) {
    const url = buildUrl(
      "/public/cms/posts",
      { q: input.q, page: input.page, pageSize: input.pageSize },
      input.workspaceSlug
    );
    const data = await request({ url });
    return ListPublicCmsPostsOutputSchema.parse(data);
  },

  async getBlogPost(slug: string, workspaceSlug?: string | null) {
    const url = buildUrl(`/public/cms/posts/${slug}`, undefined, workspaceSlug);
    const data = await request({ url });
    return GetPublicCmsPostOutputSchema.parse(data);
  },

  async getPage(slug: string, workspaceSlug?: string | null) {
    const url = buildUrl(`/public/pages/${slug}`, undefined, workspaceSlug);
    const data = await request({ url });
    return GetPublicCmsPostOutputSchema.parse(data);
  },

  async resolveWebsitePage(input: {
    host: string;
    path: string;
    locale?: string;
    mode?: "live" | "preview";
    token?: string;
  }) {
    const parsed = ResolveWebsitePublicInputSchema.parse({
      host: input.host,
      path: input.path,
      locale: input.locale,
      mode: input.mode,
      token: input.token,
    });
    const url = buildUrl("/public/website/resolve", {
      host: parsed.host,
      path: parsed.path,
      locale: parsed.locale,
      mode: parsed.mode,
      token: parsed.token,
    });
    const data = await request({ url });
    return ResolveWebsitePublicOutputSchema.parse(data);
  },

  async websiteSlugExists(input: { workspaceSlug: string; websiteSlug: string }) {
    const url = buildUrl("/public/website/slug-exists", {
      workspaceSlug: input.workspaceSlug,
      websiteSlug: input.websiteSlug,
    });
    const data = await request({ url });
    return WebsiteSlugExistsOutputSchema.parse(data);
  },

  async createWebsiteFeedback(
    input: unknown,
    options?: {
      workspaceSlug?: string | null;
    }
  ) {
    const parsed = CreateWebsiteFeedbackInputSchema.parse(input);
    const url = buildUrl("/public/website/feedback", undefined, options?.workspaceSlug);
    const data = await request({
      url,
      method: "POST",
      body: parsed,
    });
    return CreateWebsiteFeedbackOutputSchema.parse(data);
  },

  async listWebsiteQa(
    input: unknown,
    options?: {
      workspaceSlug?: string | null;
    }
  ) {
    const parsed = ListWebsiteQaInputSchema.parse(input);
    const url = buildUrl(
      "/public/website/qa",
      {
        hostname: parsed.hostname,
        path: parsed.path,
        locale: parsed.locale,
        scope: parsed.scope,
      },
      options?.workspaceSlug
    );
    const data = await request({ url });
    return ListWebsiteQaOutputSchema.parse(data);
  },

  async listWallOfLoveItems(
    input: unknown,
    options?: {
      workspaceSlug?: string | null;
    }
  ) {
    const parsed = ListPublicWebsiteWallOfLoveItemsInputSchema.parse(input);
    const url = buildUrl(
      "/public/website/wall-of-love",
      {
        siteId: parsed.siteId,
        locale: parsed.locale,
      },
      options?.workspaceSlug
    );
    const data = await request({ url });
    return ListPublicWebsiteWallOfLoveItemsOutputSchema.parse(data);
  },

  async submitPublicForm(
    publicId: string,
    input: unknown,
    options?: {
      workspaceSlug?: string | null;
    }
  ) {
    const parsed = PublicSubmitInputSchema.parse(input);
    const url = buildUrl(
      `/public/forms/${publicId}/submissions`,
      undefined,
      options?.workspaceSlug
    );
    const data = await request({
      url,
      method: "POST",
      body: parsed,
    });
    return PublicSubmitOutputSchema.parse(data);
  },
};
