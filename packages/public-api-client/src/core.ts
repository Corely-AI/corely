import { request } from "@corely/api-client";
import {
  CheckAvailabilityOutputSchema,
  PublicBookingPageOutputSchema,
  PublicBookingServicesOutputSchema,
  PublicBookingAvailabilityInputSchema,
  PublicBookingAvailabilityOutputSchema,
  PublicCreateBookingHoldInputSchema,
  PublicCreateBookingHoldOutputSchema,
  PublicConfirmBookingInputSchema,
  PublicConfirmBookingOutputSchema,
  PublicBookingSummaryOutputSchema,
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
  ResolveWebsitePublicSiteSettingsInputSchema,
  ResolveWebsitePublicSiteSettingsOutputSchema,
  WebsiteSlugExistsOutputSchema,
} from "@corely/contracts";

type QueryValue = string | number | boolean | undefined | null;

export type PublicApiClientOptions = {
  baseUrl?: string;
  headers?: HeadersInit;
};

export type WorkspaceRequestOptions = {
  workspaceSlug?: string | null;
  headers?: HeadersInit;
};

const withQuery = (baseUrl: string, params?: Record<string, QueryValue>): string => {
  if (!params) {
    return baseUrl;
  }
  const searchParams = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value === undefined || value === null) {
      return;
    }
    searchParams.set(key, String(value));
  });
  const query = searchParams.toString();
  if (!query) {
    return baseUrl;
  }
  return `${baseUrl}${baseUrl.includes("?") ? "&" : "?"}${query}`;
};

const toHeaderRecord = (headers?: HeadersInit): Record<string, string> => {
  if (!headers) {
    return {};
  }
  if (headers instanceof Headers) {
    const entries: Record<string, string> = {};
    headers.forEach((value, key) => {
      entries[key] = value;
    });
    return entries;
  }
  if (Array.isArray(headers)) {
    return Object.fromEntries(headers);
  }
  return headers as Record<string, string>;
};

const mergeHeaders = (base?: HeadersInit, override?: HeadersInit): HeadersInit | undefined => {
  const merged = {
    ...toHeaderRecord(base),
    ...toHeaderRecord(override),
  };
  if (Object.keys(merged).length === 0) {
    return undefined;
  }
  return merged;
};

export const resolvePublicApiBaseUrl = (baseUrl?: string) =>
  baseUrl ||
  process.env.CORELY_API_BASE_URL ||
  process.env.PUBLIC_API_BASE_URL ||
  process.env.NEXT_PUBLIC_API_BASE_URL ||
  "http://localhost:3000";

export const buildPublicFileUrl = (fileId: string, options?: { baseUrl?: string }) =>
  `${resolvePublicApiBaseUrl(options?.baseUrl).replace(/\/$/, "")}/public/documents/files/${fileId}`;

const buildUrl = (input: {
  baseUrl: string;
  path: string;
  params?: Record<string, QueryValue>;
  workspaceSlug?: string | null;
}) => {
  const prefix = input.workspaceSlug ? `/w/${input.workspaceSlug}` : "";
  const normalizedBase = input.baseUrl.replace(/\/$/, "");
  return withQuery(`${normalizedBase}${prefix}${input.path}`, input.params);
};

export const createPublicApiClient = (options?: PublicApiClientOptions) => {
  const baseUrl = resolvePublicApiBaseUrl(options?.baseUrl);
  const clientHeaders = options?.headers;

  return {
    async listPortfolioShowcases(input: {
      q?: string;
      type?: "individual" | "company" | "hybrid";
      page?: number;
      pageSize?: number;
      workspaceSlug?: string | null;
    }) {
      const { workspaceSlug, ...query } = input;
      const parsed = PublicPortfolioShowcaseListInputSchema.parse(query);
      const url = buildUrl({
        baseUrl,
        path: "/public/portfolio",
        params: {
          q: parsed.q,
          type: parsed.type,
          page: parsed.page,
          pageSize: parsed.pageSize,
        },
        workspaceSlug,
      });
      const data = await request({
        url,
        headers: clientHeaders,
      });
      return PublicPortfolioShowcasesOutputSchema.parse(data);
    },

    async getPortfolioShowcase(
      slug: string,
      workspaceSlug?: string | null,
      requestOptions?: { headers?: HeadersInit }
    ) {
      const url = buildUrl({
        baseUrl,
        path: `/public/portfolio/${slug}`,
        workspaceSlug,
      });
      const data = await request({
        url,
        headers: mergeHeaders(clientHeaders, requestOptions?.headers),
      });
      return PublicPortfolioShowcaseOutputSchema.parse(data);
    },

    async listPortfolioProjects(
      showcaseSlug: string,
      workspaceSlug?: string | null,
      requestOptions?: { headers?: HeadersInit }
    ) {
      const url = buildUrl({
        baseUrl,
        path: `/public/portfolio/showcases/${showcaseSlug}/projects`,
        workspaceSlug,
      });
      const data = await request({
        url,
        headers: mergeHeaders(clientHeaders, requestOptions?.headers),
      });
      return PublicPortfolioProjectsOutputSchema.parse(data);
    },

    async getPortfolioProject(
      showcaseSlug: string,
      projectSlug: string,
      workspaceSlug?: string | null,
      requestOptions?: { headers?: HeadersInit }
    ) {
      const url = buildUrl({
        baseUrl,
        path: `/public/portfolio/showcases/${showcaseSlug}/projects/${projectSlug}`,
        workspaceSlug,
      });
      const data = await request({
        url,
        headers: mergeHeaders(clientHeaders, requestOptions?.headers),
      });
      return PublicPortfolioProjectOutputSchema.parse(data);
    },

    async listRentals(input: { q?: string; categorySlug?: string; workspaceSlug?: string | null }) {
      const url = buildUrl({
        baseUrl,
        path: "/public/rentals/properties",
        params: { q: input.q, categorySlug: input.categorySlug },
        workspaceSlug: input.workspaceSlug,
      });
      const data = await request({
        url,
        headers: clientHeaders,
      });
      return ListPublicRentalPropertiesOutputSchema.parse(data);
    },

    async getRentalProperty(
      slug: string,
      workspaceSlug?: string | null,
      requestOptions?: { headers?: HeadersInit }
    ) {
      const url = buildUrl({
        baseUrl,
        path: `/public/rentals/properties/${slug}`,
        workspaceSlug,
      });
      const data = await request({
        url,
        headers: mergeHeaders(clientHeaders, requestOptions?.headers),
      });
      return GetPublicRentalPropertyOutputSchema.parse(data);
    },

    async listRentalCategories(
      workspaceSlug?: string | null,
      requestOptions?: { headers?: HeadersInit }
    ) {
      const url = buildUrl({
        baseUrl,
        path: "/public/rentals/categories",
        workspaceSlug,
      });
      const data = await request({
        url,
        headers: mergeHeaders(clientHeaders, requestOptions?.headers),
      });
      return ListRentalCategoriesOutputSchema.parse(data);
    },

    async checkRentalAvailability(input: {
      propertySlug: string;
      from: string;
      to: string;
      workspaceSlug?: string | null;
    }) {
      const url = buildUrl({
        baseUrl,
        path: `/public/rentals/properties/${input.propertySlug}/availability`,
        params: { from: input.from, to: input.to },
        workspaceSlug: input.workspaceSlug,
      });
      const data = await request({
        url,
        headers: clientHeaders,
      });
      return CheckAvailabilityOutputSchema.parse(data);
    },

    async getRentalSettings(
      workspaceSlug?: string | null,
      requestOptions?: { headers?: HeadersInit }
    ) {
      const url = buildUrl({
        baseUrl,
        path: "/public/rentals/settings",
        workspaceSlug,
      });
      const data = await request({
        url,
        headers: mergeHeaders(clientHeaders, requestOptions?.headers),
      });
      return GetRentalContactSettingsOutputSchema.parse(data);
    },

    async getPublicBookingPage(
      slug: string,
      workspaceSlug?: string | null,
      requestOptions?: { headers?: HeadersInit }
    ) {
      const url = buildUrl({
        baseUrl,
        path: `/public/booking/pages/${slug}`,
        workspaceSlug,
      });
      const data = await request({
        url,
        headers: mergeHeaders(clientHeaders, requestOptions?.headers),
      });
      return PublicBookingPageOutputSchema.parse(data);
    },

    async listPublicBookingServices(
      slug: string,
      workspaceSlug?: string | null,
      requestOptions?: { headers?: HeadersInit }
    ) {
      const url = buildUrl({
        baseUrl,
        path: `/public/booking/pages/${slug}/services`,
        workspaceSlug,
      });
      const data = await request({
        url,
        headers: mergeHeaders(clientHeaders, requestOptions?.headers),
      });
      return PublicBookingServicesOutputSchema.parse(data);
    },

    async getPublicBookingAvailability(input: {
      slug: string;
      serviceId: string;
      staffId?: string;
      from: string;
      to: string;
      day?: string;
      workspaceSlug?: string | null;
    }) {
      const parsed = PublicBookingAvailabilityInputSchema.parse({
        serviceId: input.serviceId,
        staffId: input.staffId,
        from: input.from,
        to: input.to,
        day: input.day,
      });
      const url = buildUrl({
        baseUrl,
        path: `/public/booking/pages/${input.slug}/availability`,
        params: {
          serviceId: parsed.serviceId,
          staffId: parsed.staffId,
          from: parsed.from,
          to: parsed.to,
          day: parsed.day,
        },
        workspaceSlug: input.workspaceSlug,
      });
      const data = await request({
        url,
        headers: clientHeaders,
      });
      return PublicBookingAvailabilityOutputSchema.parse(data);
    },

    async createPublicBookingHold(
      slug: string,
      input: unknown,
      requestOptions?: WorkspaceRequestOptions
    ) {
      const parsed = PublicCreateBookingHoldInputSchema.parse(input);
      const url = buildUrl({
        baseUrl,
        path: `/public/booking/pages/${slug}/holds`,
        workspaceSlug: requestOptions?.workspaceSlug,
      });
      const data = await request({
        url,
        method: "POST",
        body: parsed,
        headers: mergeHeaders(clientHeaders, requestOptions?.headers),
      });
      return PublicCreateBookingHoldOutputSchema.parse(data);
    },

    async confirmPublicBooking(
      slug: string,
      input: unknown,
      requestOptions?: WorkspaceRequestOptions
    ) {
      const parsed = PublicConfirmBookingInputSchema.parse(input);
      const url = buildUrl({
        baseUrl,
        path: `/public/booking/pages/${slug}/confirm`,
        workspaceSlug: requestOptions?.workspaceSlug,
      });
      const data = await request({
        url,
        method: "POST",
        body: parsed,
        headers: mergeHeaders(clientHeaders, requestOptions?.headers),
      });
      return PublicConfirmBookingOutputSchema.parse(data);
    },

    async getPublicBookingSummary(
      slug: string,
      bookingId: string,
      workspaceSlug?: string | null,
      requestOptions?: { headers?: HeadersInit }
    ) {
      const url = buildUrl({
        baseUrl,
        path: `/public/booking/pages/${slug}/bookings/${bookingId}`,
        workspaceSlug,
      });
      const data = await request({
        url,
        headers: mergeHeaders(clientHeaders, requestOptions?.headers),
      });
      return PublicBookingSummaryOutputSchema.parse(data);
    },

    async listBlogPosts(input: {
      q?: string;
      page?: number;
      pageSize?: number;
      workspaceSlug?: string | null;
    }) {
      const url = buildUrl({
        baseUrl,
        path: "/public/cms/posts",
        params: { q: input.q, page: input.page, pageSize: input.pageSize },
        workspaceSlug: input.workspaceSlug,
      });
      const data = await request({
        url,
        headers: clientHeaders,
      });
      return ListPublicCmsPostsOutputSchema.parse(data);
    },

    async getBlogPost(
      slug: string,
      workspaceSlug?: string | null,
      requestOptions?: { headers?: HeadersInit }
    ) {
      const url = buildUrl({
        baseUrl,
        path: `/public/cms/posts/${slug}`,
        workspaceSlug,
      });
      const data = await request({
        url,
        headers: mergeHeaders(clientHeaders, requestOptions?.headers),
      });
      return GetPublicCmsPostOutputSchema.parse(data);
    },

    async getPage(
      slug: string,
      workspaceSlug?: string | null,
      requestOptions?: { headers?: HeadersInit }
    ) {
      const url = buildUrl({
        baseUrl,
        path: `/public/pages/${slug}`,
        workspaceSlug,
      });
      const data = await request({
        url,
        headers: mergeHeaders(clientHeaders, requestOptions?.headers),
      });
      return GetPublicCmsPostOutputSchema.parse(data);
    },

    async resolveWebsitePage(
      input: {
        host: string;
        path: string;
        locale?: string;
        mode?: "live" | "preview";
        token?: string;
      },
      requestOptions?: { headers?: HeadersInit }
    ) {
      const parsed = ResolveWebsitePublicInputSchema.parse({
        host: input.host,
        path: input.path,
        locale: input.locale,
        mode: input.mode,
        token: input.token,
      });
      const url = buildUrl({
        baseUrl,
        path: "/public/website/resolve",
        params: {
          host: parsed.host,
          path: parsed.path,
          locale: parsed.locale,
          mode: parsed.mode,
          token: parsed.token,
        },
      });
      const data = await request({
        url,
        headers: mergeHeaders(clientHeaders, requestOptions?.headers),
      });
      return ResolveWebsitePublicOutputSchema.parse(data);
    },

    async resolveWebsiteSettings(
      input: { siteId: string },
      requestOptions?: { headers?: HeadersInit }
    ) {
      const parsed = ResolveWebsitePublicSiteSettingsInputSchema.parse(input);
      const url = buildUrl({
        baseUrl,
        path: "/public/website/settings",
        params: { siteId: parsed.siteId },
      });
      const data = await request({
        url,
        headers: mergeHeaders(clientHeaders, requestOptions?.headers),
      });
      return ResolveWebsitePublicSiteSettingsOutputSchema.parse(data);
    },

    async websiteSlugExists(
      input: { workspaceSlug: string; websiteSlug: string },
      requestOptions?: { headers?: HeadersInit }
    ) {
      const url = buildUrl({
        baseUrl,
        path: "/public/website/slug-exists",
        params: {
          workspaceSlug: input.workspaceSlug,
          websiteSlug: input.websiteSlug,
        },
      });
      const data = await request({
        url,
        headers: mergeHeaders(clientHeaders, requestOptions?.headers),
      });
      return WebsiteSlugExistsOutputSchema.parse(data);
    },

    async createWebsiteFeedback(input: unknown, requestOptions?: WorkspaceRequestOptions) {
      const parsed = CreateWebsiteFeedbackInputSchema.parse(input);
      const url = buildUrl({
        baseUrl,
        path: "/public/website/feedback",
        workspaceSlug: requestOptions?.workspaceSlug,
      });
      const data = await request({
        url,
        method: "POST",
        body: parsed,
        headers: mergeHeaders(clientHeaders, requestOptions?.headers),
      });
      return CreateWebsiteFeedbackOutputSchema.parse(data);
    },

    async listWebsiteQa(input: unknown, requestOptions?: WorkspaceRequestOptions) {
      const parsed = ListWebsiteQaInputSchema.parse(input);
      const url = buildUrl({
        baseUrl,
        path: "/public/website/qa",
        params: {
          siteId: parsed.siteId,
          hostname: parsed.hostname,
          path: parsed.path,
          locale: parsed.locale,
          scope: parsed.scope,
          pageId: parsed.pageId,
        },
        workspaceSlug: requestOptions?.workspaceSlug,
      });
      const data = await request({
        url,
        headers: mergeHeaders(clientHeaders, requestOptions?.headers),
      });
      return ListWebsiteQaOutputSchema.parse(data);
    },

    async listWallOfLoveItems(input: unknown, requestOptions?: WorkspaceRequestOptions) {
      const parsed = ListPublicWebsiteWallOfLoveItemsInputSchema.parse(input);
      const url = buildUrl({
        baseUrl,
        path: "/public/website/wall-of-love",
        params: {
          siteId: parsed.siteId,
          locale: parsed.locale,
        },
        workspaceSlug: requestOptions?.workspaceSlug,
      });
      const data = await request({
        url,
        headers: mergeHeaders(clientHeaders, requestOptions?.headers),
      });
      return ListPublicWebsiteWallOfLoveItemsOutputSchema.parse(data);
    },

    async submitPublicForm(
      publicId: string,
      input: unknown,
      requestOptions?: WorkspaceRequestOptions
    ) {
      const parsed = PublicSubmitInputSchema.parse(input);
      const url = buildUrl({
        baseUrl,
        path: `/public/forms/${publicId}/submissions`,
        workspaceSlug: requestOptions?.workspaceSlug,
      });
      const data = await request({
        url,
        method: "POST",
        body: parsed,
        headers: mergeHeaders(clientHeaders, requestOptions?.headers),
      });
      return PublicSubmitOutputSchema.parse(data);
    },
  };
};

export type PublicApiClient = ReturnType<typeof createPublicApiClient>;

export const publicApi = createPublicApiClient();
