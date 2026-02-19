import { ValidationError } from "@corely/kernel";

const YOUTUBE_VIDEO_ID_REGEX = /^[A-Za-z0-9_-]{11}$/;

const YOUTUBE_HOSTS = new Set(["youtube.com", "www.youtube.com", "m.youtube.com", "youtu.be"]);

const toCanonicalYoutubeUrl = (videoId: string): string =>
  `https://www.youtube.com/watch?v=${videoId}`;

const extractVideoIdFromPath = (pathname: string): string | null => {
  const segments = pathname.split("/").filter(Boolean);
  return segments[0] ?? null;
};

const extractYoutubeVideoId = (url: URL): string | null => {
  const host = url.hostname.toLowerCase();

  if (!YOUTUBE_HOSTS.has(host)) {
    return null;
  }

  if (host === "youtu.be") {
    return extractVideoIdFromPath(url.pathname);
  }

  if (url.pathname === "/watch") {
    return url.searchParams.get("v");
  }

  if (url.pathname.startsWith("/shorts/")) {
    return extractVideoIdFromPath(url.pathname.replace("/shorts/", ""));
  }

  if (url.pathname.startsWith("/embed/")) {
    return extractVideoIdFromPath(url.pathname.replace("/embed/", ""));
  }

  if (url.pathname.startsWith("/live/")) {
    return extractVideoIdFromPath(url.pathname.replace("/live/", ""));
  }

  return null;
};

export type NormalizedYoutubeVideo = {
  provider: "youtube";
  videoId: string;
  url: string;
};

export const normalizeYoutubeUrl = (rawUrl: string): NormalizedYoutubeVideo => {
  let parsedUrl: URL;
  try {
    parsedUrl = new URL(rawUrl.trim());
  } catch {
    throw new ValidationError(
      `Invalid YouTube URL: ${rawUrl}`,
      undefined,
      "Website:InvalidYoutubeUrl"
    );
  }

  const videoId = extractYoutubeVideoId(parsedUrl);
  if (!videoId || !YOUTUBE_VIDEO_ID_REGEX.test(videoId)) {
    throw new ValidationError(
      `Invalid YouTube URL: ${rawUrl}`,
      undefined,
      "Website:InvalidYoutubeUrl"
    );
  }

  return {
    provider: "youtube",
    videoId,
    url: toCanonicalYoutubeUrl(videoId),
  };
};

export const normalizeYoutubeUrls = (rawUrls: string[] | undefined): NormalizedYoutubeVideo[] => {
  if (!rawUrls?.length) {
    return [];
  }

  const dedupedByVideoId = new Map<string, NormalizedYoutubeVideo>();
  for (const rawUrl of rawUrls) {
    const normalized = normalizeYoutubeUrl(rawUrl);
    if (!dedupedByVideoId.has(normalized.videoId)) {
      dedupedByVideoId.set(normalized.videoId, normalized);
    }
  }

  return Array.from(dedupedByVideoId.values());
};
