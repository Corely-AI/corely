import { describe, expect, it } from "vitest";
import {
  buildWebsitePathFromSegments,
  buildWebsiteRewritePath,
  isPreviewMode,
  resolveLocaleFromAcceptLanguage,
  shouldRewriteToWebsite,
  splitLocaleFromPath,
} from "@/lib/website-routing";

describe("website-routing", () => {
  it("builds website path from segments", () => {
    expect(buildWebsitePathFromSegments(undefined)).toBe("/");
    expect(buildWebsitePathFromSegments([])).toBe("/");
    expect(buildWebsitePathFromSegments(["about"])).toBe("/about");
    expect(buildWebsitePathFromSegments(["en", "pricing"])).toBe("/en/pricing");
  });

  it("splits locale from pathname when present", () => {
    expect(splitLocaleFromPath("/en/about")).toEqual({ path: "/about", locale: "en" });
    expect(splitLocaleFromPath("/en")).toEqual({ path: "/", locale: "en" });
    expect(splitLocaleFromPath("/en-US/team")).toEqual({ path: "/team", locale: "en-US" });
    expect(splitLocaleFromPath("/about")).toEqual({ path: "/about" });
  });

  it("resolves locale from accept-language header", () => {
    expect(resolveLocaleFromAcceptLanguage("fr-CA,fr;q=0.8,en-US;q=0.6")).toBe("fr-CA");
    expect(resolveLocaleFromAcceptLanguage("invalid")).toBeNull();
  });

  it("builds website rewrite path", () => {
    expect(buildWebsiteRewritePath("/")).toBe("/__website");
    expect(buildWebsiteRewritePath("/rentals")).toBe("/__website/rentals");
  });

  it("determines rewrite eligibility based on host mode", () => {
    expect(shouldRewriteToWebsite({ pathname: "/rentals", isWebsiteHost: false })).toBe(false);
    expect(shouldRewriteToWebsite({ pathname: "/rentals", isWebsiteHost: true })).toBe(true);
    expect(shouldRewriteToWebsite({ pathname: "/__website/foo", isWebsiteHost: true })).toBe(false);
  });

  it("detects preview mode values", () => {
    expect(isPreviewMode("1")).toBe(true);
    expect(isPreviewMode("true")).toBe(true);
    expect(isPreviewMode("yes")).toBe(true);
    expect(isPreviewMode("no")).toBe(false);
  });
});
