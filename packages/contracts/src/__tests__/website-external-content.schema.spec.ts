import { describe, expect, it } from "vitest";
import {
  SiteCopySchema,
  WebsiteExternalContentEnvelopeByKeySchema,
  parseWebsiteExternalContentData,
} from "../website/external";

describe("website external content contracts", () => {
  it("validates siteCopy by key", () => {
    const parsed = parseWebsiteExternalContentData("siteCopy", {
      nav: { brand: "Corely" },
    });

    expect(parsed.nav).toEqual({ brand: "Corely" });
  });

  it("validates envelope data based on key", () => {
    const parsed = WebsiteExternalContentEnvelopeByKeySchema.parse({
      key: "siteCopy",
      version: "published",
      updatedAt: "2026-02-24T12:00:00.000Z",
      data: SiteCopySchema.parse({ hero: { headline: "Hello" } }),
    });

    expect(parsed.key).toBe("siteCopy");
    expect(parsed.version).toBe("published");
    expect(parsed.data).toMatchObject({ hero: { headline: "Hello" } });
  });
});
