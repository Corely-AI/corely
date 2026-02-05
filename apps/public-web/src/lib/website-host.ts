import { resolvePublicApiBaseUrl } from "./public-api-base";
import { normalizeWebsitePath } from "./website-routing";

export const isWebsiteHost = async (input: { host: string | null }): Promise<boolean> => {
  if (!input.host) {
    return false;
  }

  const baseUrl = resolvePublicApiBaseUrl().replace(/\/$/, "");
  const url = new URL(`${baseUrl}/public/website/resolve`);
  url.searchParams.set("host", input.host);
  url.searchParams.set("path", normalizeWebsitePath("/"));

  try {
    const response = await fetch(url.toString(), {
      method: "GET",
      headers: {
        Accept: "application/json",
      },
      next: { revalidate: 60 },
    });

    if (response.status === 404) {
      return false;
    }

    return response.ok;
  } catch {
    return false;
  }
};
