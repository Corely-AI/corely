import { describe, expect, it } from "vitest";
import { resolveCanonicalUrl, resolveWorkspacePath } from "@/lib/urls";

describe("public-web urls", () => {
  it("builds workspace paths for dev-style routing", () => {
    expect(
      resolveWorkspacePath({
        host: "localhost:8082",
        workspaceSlug: "acme",
        path: "/rentals/slug",
      })
    ).toBe("/w/acme/rentals/slug");

    expect(
      resolveWorkspacePath({
        host: null,
        workspaceSlug: "acme",
        path: "/cms/hello",
      })
    ).toBe("/w/acme/cms/hello");
  });

  it("keeps host-based paths for workspace subdomains", () => {
    expect(
      resolveWorkspacePath({
        host: "acme.my.corely.one",
        workspaceSlug: "acme",
        path: "/rentals/slug",
      })
    ).toBe("/rentals/slug");
  });

  it("builds canonical URLs for workspace hosts", () => {
    expect(
      resolveCanonicalUrl({
        host: "acme.my.corely.one",
        protocol: "https",
        workspaceSlug: "acme",
        path: "/",
      })
    ).toBe("https://acme.my.corely.one/");
  });

  it("builds canonical URLs with /w prefix when host is not workspace", () => {
    expect(
      resolveCanonicalUrl({
        host: "localhost:8082",
        protocol: "http",
        workspaceSlug: "acme",
        path: "/portfolio/slug",
      })
    ).toBe("https://corely.one/w/acme/portfolio/slug");
  });
});
