import { describe, expect, it } from "vitest";
import { ValidationError } from "@corely/kernel";
import {
  normalizeWallOfLoveLink,
  parseYouTubeUrl,
  validateXUrl,
} from "../domain/wall-of-love-links";

describe("wall-of-love link helpers", () => {
  it("parses and normalizes YouTube URLs", () => {
    const parsed = parseYouTubeUrl("https://youtu.be/dQw4w9WgXcQ?t=3");
    expect(parsed).not.toBeNull();
    expect(parsed?.videoId).toBe("dQw4w9WgXcQ");
    expect(parsed?.canonicalUrl).toBe("https://www.youtube.com/watch?v=dQw4w9WgXcQ");
  });

  it("returns null for non-youtube URLs", () => {
    expect(parseYouTubeUrl("https://vimeo.com/1234")).toBeNull();
  });

  it("validates and normalizes X URLs", () => {
    expect(validateXUrl("https://twitter.com/corely/status/12345")).toBe(
      "https://x.com/corely/status/12345"
    );
    expect(validateXUrl("https://x.com/corely/status/12345/")).toBe(
      "https://x.com/corely/status/12345"
    );
  });

  it("returns null for invalid X URLs", () => {
    expect(validateXUrl("https://example.com/post")).toBeNull();
  });

  it("normalizes by wall-of-love type", () => {
    expect(normalizeWallOfLoveLink("image", null)).toBeNull();
    expect(normalizeWallOfLoveLink("youtube", "https://youtu.be/dQw4w9WgXcQ")).toBe(
      "https://www.youtube.com/watch?v=dQw4w9WgXcQ"
    );
    expect(normalizeWallOfLoveLink("x", "https://twitter.com/corely/status/123")).toBe(
      "https://x.com/corely/status/123"
    );
  });

  it("throws validation error for invalid typed links", () => {
    expect(() => normalizeWallOfLoveLink("youtube", null)).toThrow(ValidationError);
    expect(() => normalizeWallOfLoveLink("x", "https://example.com/not-x")).toThrow(
      ValidationError
    );
  });
});
