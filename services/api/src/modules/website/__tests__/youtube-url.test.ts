import { describe, expect, it } from "vitest";
import { ValidationError } from "@corely/kernel";
import { normalizeYoutubeUrl, normalizeYoutubeUrls } from "../domain/youtube-url";

describe("website youtube url normalization", () => {
  it("normalizes watch URLs into canonical youtube watch format", () => {
    const normalized = normalizeYoutubeUrl("https://www.youtube.com/watch?v=dQw4w9WgXcQ");

    expect(normalized.videoId).toBe("dQw4w9WgXcQ");
    expect(normalized.provider).toBe("youtube");
    expect(normalized.url).toBe("https://www.youtube.com/watch?v=dQw4w9WgXcQ");
  });

  it("normalizes youtu.be URLs", () => {
    const normalized = normalizeYoutubeUrl("https://youtu.be/dQw4w9WgXcQ?t=43");

    expect(normalized.videoId).toBe("dQw4w9WgXcQ");
    expect(normalized.url).toBe("https://www.youtube.com/watch?v=dQw4w9WgXcQ");
  });

  it("dedupes by video ID while preserving first occurrence", () => {
    const normalized = normalizeYoutubeUrls([
      "https://youtu.be/dQw4w9WgXcQ",
      "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
      "https://www.youtube.com/watch?v=3JZ_D3ELwOQ",
    ]);

    expect(normalized).toHaveLength(2);
    expect(normalized[0]?.videoId).toBe("dQw4w9WgXcQ");
    expect(normalized[1]?.videoId).toBe("3JZ_D3ELwOQ");
  });

  it("rejects non-youtube hosts", () => {
    expect(() => normalizeYoutubeUrl("https://vimeo.com/123456")).toThrow(ValidationError);
  });

  it("rejects invalid video IDs", () => {
    expect(() => normalizeYoutubeUrl("https://www.youtube.com/watch?v=short")).toThrow(
      ValidationError
    );
  });
});
