import { describe, expect, it } from "vitest";
import { normalizeHostname, normalizePath, normalizeLocale } from "../domain/website.validators";
import { WebsitePageBlueprintSchema } from "@corely/contracts";

describe("website validators", () => {
  it("normalizes paths", () => {
    expect(normalizePath("about")).toBe("/about");
    expect(normalizePath("/about/")).toBe("/about");
    expect(normalizePath("/")).toBe("/");
  });

  it("rejects invalid paths", () => {
    expect(() => normalizePath("/bad//path")).toThrow();
  });

  it("normalizes hostnames", () => {
    expect(normalizeHostname("Example.com")).toBe("example.com");
  });

  it("rejects invalid hostnames", () => {
    expect(() => normalizeHostname("https://example.com")).toThrow();
  });

  it("normalizes locales", () => {
    expect(normalizeLocale("en-us")).toBe("en-US");
  });
});

describe("website blueprint schema", () => {
  it("accepts valid blueprint", () => {
    const parsed = WebsitePageBlueprintSchema.parse({
      title: "About",
      excerpt: "About us",
      template: "landing",
      suggestedPath: "/about",
      seoTitle: "About",
      seoDescription: "About us",
      contentJson: { type: "doc", content: [] },
    });
    expect(parsed.title).toBe("About");
  });

  it("rejects invalid blueprint", () => {
    expect(() =>
      WebsitePageBlueprintSchema.parse({
        title: "",
        excerpt: "",
        template: "",
        contentJson: { type: "doc", content: [] },
      })
    ).toThrow();
  });
});
