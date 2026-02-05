import { describe, expect, it } from "vitest";
import {
  buildPublicUrl,
  buildPublicRentalUrl,
  buildPublicPortfolioUrl,
  buildPublicCmsUrl,
  PublicUrlError,
} from "../public-urls";

describe("public-urls", () => {
  it("builds dev URLs for each module", () => {
    expect(buildPublicRentalUrl({ workspaceSlug: "acme", slug: "beach-house", env: "dev" })).toBe(
      "http://localhost:8082/w/acme/rentals/beach-house"
    );

    expect(buildPublicPortfolioUrl({ workspaceSlug: "acme", slug: "studio", env: "dev" })).toBe(
      "http://localhost:8082/w/acme/portfolio/studio"
    );

    expect(buildPublicCmsUrl({ workspaceSlug: "acme", slug: "hello", env: "dev" })).toBe(
      "http://localhost:8082/w/acme/cms/hello"
    );

    expect(
      buildPublicUrl({
        workspaceSlug: "acme",
        kind: "website",
        websiteSlug: "main",
        pagePath: "/about",
        env: "dev",
      })
    ).toBe("http://localhost:8082/w/acme/main/about");
  });

  it("builds prod URLs for each module", () => {
    expect(buildPublicRentalUrl({ workspaceSlug: "acme", slug: "beach-house", env: "prod" })).toBe(
      "https://acme.my.corely.one/rentals/beach-house"
    );

    expect(buildPublicPortfolioUrl({ workspaceSlug: "acme", slug: "studio", env: "prod" })).toBe(
      "https://acme.my.corely.one/portfolio/studio"
    );

    expect(buildPublicCmsUrl({ workspaceSlug: "acme", slug: "hello", env: "prod" })).toBe(
      "https://acme.my.corely.one/cms/hello"
    );

    expect(
      buildPublicUrl({
        workspaceSlug: "acme",
        kind: "website",
        websiteSlug: "main",
        pagePath: "/about",
        env: "prod",
        isDefaultWebsite: false,
      })
    ).toBe("https://acme.my.corely.one/main/about");
  });

  it("builds default website root correctly", () => {
    expect(
      buildPublicUrl({
        workspaceSlug: "acme",
        kind: "website",
        env: "prod",
        isDefaultWebsite: true,
        pagePath: "/",
      })
    ).toBe("https://acme.my.corely.one/");

    expect(
      buildPublicUrl({
        workspaceSlug: "acme",
        kind: "website",
        env: "prod",
        isDefaultWebsite: true,
        pagePath: "/about",
      })
    ).toBe("https://acme.my.corely.one/about");
  });

  it("rejects reserved website slugs", () => {
    try {
      buildPublicUrl({
        workspaceSlug: "acme",
        kind: "website",
        websiteSlug: "rentals",
        env: "dev",
      });
      throw new Error("Expected error was not thrown");
    } catch (error) {
      expect(error).toBeInstanceOf(PublicUrlError);
      expect((error as PublicUrlError).code).toBe("PublicUrl:ReservedPrefix");
    }
  });

  it("rejects reserved page paths for default website in prod", () => {
    try {
      buildPublicUrl({
        workspaceSlug: "acme",
        kind: "website",
        env: "prod",
        isDefaultWebsite: true,
        pagePath: "/rentals/summer",
      });
      throw new Error("Expected error was not thrown");
    } catch (error) {
      expect(error).toBeInstanceOf(PublicUrlError);
      expect((error as PublicUrlError).code).toBe("PublicUrl:InvalidPath");
    }
  });

  it("honors originOverride", () => {
    expect(
      buildPublicUrl({
        workspaceSlug: "acme",
        kind: "rentals",
        slug: "beach-house",
        env: "prod",
        originOverride: "https://public.example.com",
      })
    ).toBe("https://public.example.com/rentals/beach-house");
  });

  it("supports forcing path workspace in prod", () => {
    expect(
      buildPublicUrl({
        workspaceSlug: "acme",
        kind: "rentals",
        slug: "beach-house",
        env: "prod",
        usePathWorkspace: true,
      })
    ).toBe("http://localhost:8082/w/acme/rentals/beach-house");
  });
});
