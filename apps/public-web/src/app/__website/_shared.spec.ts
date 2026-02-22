import { beforeEach, describe, expect, it, vi } from "vitest";
import { HttpError } from "@corely/api-client";
import { getWebsitePageData } from "@/app/__website/_shared";

const mockResolveWebsitePage = vi.hoisted(() => vi.fn());

vi.mock("@/lib/public-api", () => ({
  publicApi: {
    resolveWebsitePage: mockResolveWebsitePage,
  },
  buildPublicFileUrl: (id: string) => `https://files.example/${id}`,
}));

describe("getWebsitePageData", () => {
  beforeEach(() => {
    mockResolveWebsitePage.mockReset();
  });

  it("returns resolved page data when resolve succeeds", async () => {
    mockResolveWebsitePage.mockResolvedValue({
      siteId: "site-1",
      siteSlug: "site",
      settings: {
        common: {
          siteTitle: "Site",
          logo: {},
          favicon: {},
          header: { showLogo: true },
          footer: { links: [] },
          socials: {},
          seo: {},
        },
        theme: { colors: {}, typography: {}, tokens: {} },
        custom: {},
      },
      pageId: "page-1",
      path: "/about",
      locale: "en-US",
      template: "default",
      payloadJson: { title: "About", contentHtml: "<p>Hi</p>" },
      seo: null,
      menus: [],
      snapshotVersion: 1,
    });

    const result = await getWebsitePageData({
      ctx: { host: "example.com", protocol: "https", acceptLanguage: "en-US,en;q=0.8" },
      pathname: "/about",
    });

    expect(result.kind).toBe("ok");
    if (result.kind === "ok") {
      expect(result.page.path).toBe("/about");
      expect(result.locale).toBe("en-US");
    }
    expect(mockResolveWebsitePage).toHaveBeenCalledWith(
      expect.objectContaining({
        host: "example.com",
        path: "/about",
        locale: "en-US",
        mode: "live",
      })
    );
  });

  it("returns not-found when resolve returns 404", async () => {
    mockResolveWebsitePage.mockRejectedValue(
      new HttpError("Not Found", 404, { code: "Website:PageNotFound", detail: "Page not found" })
    );

    const result = await getWebsitePageData({
      ctx: { host: "example.com", protocol: "https" },
      pathname: "/missing",
    });

    expect(result.kind).toBe("not-found");
    if (result.kind === "not-found") {
      expect(result.message).toBe("Page not found");
    }
  });

  it("returns unavailable when resolve returns 500", async () => {
    mockResolveWebsitePage.mockRejectedValue(
      new HttpError("Internal Server Error", 500, { message: "Upstream failure" })
    );

    const result = await getWebsitePageData({
      ctx: { host: "example.com", protocol: "https" },
      pathname: "/about",
    });

    expect(result.kind).toBe("unavailable");
    if (result.kind === "unavailable") {
      expect(result.message).toBe("Upstream failure");
    }
  });
});
