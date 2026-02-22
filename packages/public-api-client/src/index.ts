import {
  createPublicApiClient,
  publicApi,
  resolvePublicApiBaseUrl,
  buildPublicFileUrl,
  type PublicApiClient,
  type PublicApiClientOptions,
  type WorkspaceRequestOptions,
} from "./core";

export {
  createPublicApiClient,
  publicApi,
  resolvePublicApiBaseUrl,
  buildPublicFileUrl,
  type PublicApiClient,
  type PublicApiClientOptions,
  type WorkspaceRequestOptions,
};

export const resolveWebsitePage = (
  input: Parameters<PublicApiClient["resolveWebsitePage"]>[0],
  options?: PublicApiClientOptions & { headers?: HeadersInit }
) => createPublicApiClient(options).resolveWebsitePage(input, { headers: options?.headers });

export const websiteSlugExists = (
  input: Parameters<PublicApiClient["websiteSlugExists"]>[0],
  options?: PublicApiClientOptions & { headers?: HeadersInit }
) => createPublicApiClient(options).websiteSlugExists(input, { headers: options?.headers });

export const slugExists = websiteSlugExists;

export const createWebsiteFeedback = (
  input: Parameters<PublicApiClient["createWebsiteFeedback"]>[0],
  options?: PublicApiClientOptions & WorkspaceRequestOptions
) =>
  createPublicApiClient(options).createWebsiteFeedback(input, {
    workspaceSlug: options?.workspaceSlug,
    headers: options?.headers,
  });

export const listWebsiteQa = (
  input: Parameters<PublicApiClient["listWebsiteQa"]>[0],
  options?: PublicApiClientOptions & WorkspaceRequestOptions
) =>
  createPublicApiClient(options).listWebsiteQa(input, {
    workspaceSlug: options?.workspaceSlug,
    headers: options?.headers,
  });

export const listWallOfLoveItems = (
  input: Parameters<PublicApiClient["listWallOfLoveItems"]>[0],
  options?: PublicApiClientOptions & WorkspaceRequestOptions
) =>
  createPublicApiClient(options).listWallOfLoveItems(input, {
    workspaceSlug: options?.workspaceSlug,
    headers: options?.headers,
  });

export const resolveWebsiteSettings = (
  input: Parameters<PublicApiClient["resolveWebsiteSettings"]>[0],
  options?: PublicApiClientOptions & { headers?: HeadersInit }
) => createPublicApiClient(options).resolveWebsiteSettings(input, { headers: options?.headers });
