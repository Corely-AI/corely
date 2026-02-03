import { request } from "@corely/api-client";
import {
  CheckAvailabilityOutputSchema,
  GetPublicCmsPostOutputSchema,
  ListPublicCmsPostsOutputSchema,
  GetPublicRentalPropertyOutputSchema,
  ListPublicRentalPropertiesOutputSchema,
  ListRentalCategoriesOutputSchema,
  PublicPortfolioShowcaseListInputSchema,
  PublicPortfolioShowcaseOutputSchema,
  PublicPortfolioShowcasesOutputSchema,
  PublicPortfolioProjectsOutputSchema,
  PublicPortfolioProjectOutputSchema,
} from "@corely/contracts";

export const resolvePublicApiBaseUrl = () =>
  import.meta.env.VITE_API_BASE_URL || (import.meta.env.DEV ? "/api" : "http://localhost:3000");

export const buildPublicFileUrl = (fileId: string) =>
  `${resolvePublicApiBaseUrl().replace(/\/$/, "")}/public/documents/files/${fileId}`;

const buildUrl = (
  path: string,
  params?: Record<string, string | number | boolean | undefined>,
  workspaceSlug?: string
) => {
  const prefix = workspaceSlug ? `/w/${workspaceSlug}` : "";
  const baseUrl = resolvePublicApiBaseUrl().replace(/\/$/, "");
  const url = `${baseUrl}${prefix}${path}`;
  if (!params) {
    return url;
  }

  const searchParams = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value === undefined) {
      return;
    }
    searchParams.set(key, String(value));
  });

  const query = searchParams.toString();
  if (!query) {
    return url;
  }
  return `${url}${url.includes("?") ? "&" : "?"}${query}`;
};

export const publicApi = {
  async listPortfolioShowcases(input: {
    q?: string;
    type?: "individual" | "company" | "hybrid";
    page?: number;
    pageSize?: number;
    workspaceSlug?: string;
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

  async getPortfolioShowcase(slug: string, workspaceSlug?: string) {
    const url = buildUrl(`/public/portfolio/${slug}`, undefined, workspaceSlug);
    const data = await request({ url });
    return PublicPortfolioShowcaseOutputSchema.parse(data);
  },

  async listPortfolioProjects(showcaseSlug: string, workspaceSlug?: string) {
    const url = buildUrl(
      `/public/portfolio/showcases/${showcaseSlug}/projects`,
      undefined,
      workspaceSlug
    );
    const data = await request({ url });
    return PublicPortfolioProjectsOutputSchema.parse(data);
  },

  async getPortfolioProject(showcaseSlug: string, projectSlug: string, workspaceSlug?: string) {
    const url = buildUrl(
      `/public/portfolio/showcases/${showcaseSlug}/projects/${projectSlug}`,
      undefined,
      workspaceSlug
    );
    const data = await request({ url });
    return PublicPortfolioProjectOutputSchema.parse(data);
  },

  async listRentals(input: { q?: string; categorySlug?: string; workspaceSlug?: string }) {
    const url = buildUrl(
      "/public/rentals/properties",
      { q: input.q, categorySlug: input.categorySlug },
      input.workspaceSlug
    );
    const data = await request({ url });
    return ListPublicRentalPropertiesOutputSchema.parse(data);
  },

  async getRentalProperty(slug: string, workspaceSlug?: string) {
    const url = buildUrl(`/public/rentals/properties/${slug}`, undefined, workspaceSlug);
    const data = await request({ url });
    return GetPublicRentalPropertyOutputSchema.parse(data);
  },

  async listRentalCategories(workspaceSlug?: string) {
    const url = buildUrl("/public/rentals/categories", undefined, workspaceSlug);
    const data = await request({ url });
    return ListRentalCategoriesOutputSchema.parse(data);
  },

  async checkRentalAvailability(input: {
    propertySlug: string;
    from: string;
    to: string;
    workspaceSlug?: string;
  }) {
    const url = buildUrl(
      `/public/rentals/properties/${input.propertySlug}/availability`,
      { from: input.from, to: input.to },
      input.workspaceSlug
    );
    const data = await request({ url });
    return CheckAvailabilityOutputSchema.parse(data);
  },

  async listBlogPosts(input: {
    q?: string;
    page?: number;
    pageSize?: number;
    workspaceSlug?: string;
  }) {
    const url = buildUrl(
      "/public/blog",
      { q: input.q, page: input.page, pageSize: input.pageSize },
      input.workspaceSlug
    );
    const data = await request({ url });
    return ListPublicCmsPostsOutputSchema.parse(data);
  },

  async getBlogPost(slug: string, workspaceSlug?: string) {
    const url = buildUrl(`/public/blog/${slug}`, undefined, workspaceSlug);
    const data = await request({ url });
    return GetPublicCmsPostOutputSchema.parse(data);
  },

  async getPage(slug: string, workspaceSlug?: string) {
    const url = buildUrl(`/public/pages/${slug}`, undefined, workspaceSlug);
    const data = await request({ url });
    return GetPublicCmsPostOutputSchema.parse(data);
  },
};
