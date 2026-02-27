import { ValidationError } from "@corely/kernel";

const YOUTUBE_VIDEO_ID_REGEX = /^[A-Za-z0-9_-]{11}$/;
const YOUTUBE_HOSTS = new Set(["youtube.com", "www.youtube.com", "m.youtube.com", "youtu.be"]);
const X_HOSTS = new Set(["x.com", "www.x.com", "twitter.com", "www.twitter.com"]);

const extractYoutubeVideoId = (url: URL): string | null => {
  const host = url.hostname.toLowerCase();
  if (!YOUTUBE_HOSTS.has(host)) {
    return null;
  }

  if (host === "youtu.be") {
    return url.pathname.split("/").filter(Boolean)[0] ?? null;
  }
  if (url.pathname === "/watch") {
    return url.searchParams.get("v");
  }
  if (url.pathname.startsWith("/shorts/")) {
    return url.pathname.replace("/shorts/", "").split("/")[0] ?? null;
  }
  if (url.pathname.startsWith("/embed/")) {
    return url.pathname.replace("/embed/", "").split("/")[0] ?? null;
  }
  if (url.pathname.startsWith("/live/")) {
    return url.pathname.replace("/live/", "").split("/")[0] ?? null;
  }

  return null;
};

export const parseYouTubeUrl = (
  rawUrl: string
): { videoId: string; canonicalUrl: string } | null => {
  let parsed: URL;
  try {
    parsed = new URL(rawUrl.trim());
  } catch {
    return null;
  }

  const videoId = extractYoutubeVideoId(parsed);
  if (!videoId || !YOUTUBE_VIDEO_ID_REGEX.test(videoId)) {
    return null;
  }

  return {
    videoId,
    canonicalUrl: `https://www.youtube.com/watch?v=${videoId}`,
  };
};

export const validateXUrl = (rawUrl: string): string | null => {
  let parsed: URL;
  try {
    parsed = new URL(rawUrl.trim());
  } catch {
    return null;
  }

  const host = parsed.hostname.toLowerCase();
  if (!X_HOSTS.has(host)) {
    return null;
  }

  const normalizedPath =
    parsed.pathname.length > 1 && parsed.pathname.endsWith("/")
      ? parsed.pathname.slice(0, -1)
      : parsed.pathname;
  return `https://x.com${normalizedPath}${parsed.search}`;
};

export const normalizeWallOfLoveLink = (
  type: "image" | "youtube" | "x",
  linkUrl: string | null | undefined
): string | null => {
  if (type === "image") {
    return null;
  }
  if (!linkUrl) {
    throw new ValidationError(
      `linkUrl is required for ${type} items`,
      undefined,
      "Website:WallOfLoveLinkRequired"
    );
  }

  if (type === "youtube") {
    const parsed = parseYouTubeUrl(linkUrl);
    if (!parsed) {
      throw new ValidationError(
        "Invalid YouTube URL",
        undefined,
        "Website:WallOfLoveInvalidYoutubeUrl"
      );
    }
    return parsed.canonicalUrl;
  }

  const normalizedXUrl = validateXUrl(linkUrl);
  if (!normalizedXUrl) {
    throw new ValidationError("Invalid X URL", undefined, "Website:WallOfLoveInvalidXUrl");
  }
  return normalizedXUrl;
};
