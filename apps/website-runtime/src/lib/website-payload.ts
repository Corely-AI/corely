export type CmsPayloadMeta = {
  title?: string;
  excerpt?: string | null;
  contentHtml?: string;
  contentText?: string;
  contentJson?: unknown;
};

export type WebsiteBlock = {
  type?: string;
  text?: string;
  items?: string[];
  url?: string;
  label?: string;
  src?: string;
  alt?: string;
  level?: number;
  [key: string]: unknown;
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  Boolean(value && typeof value === "object" && !Array.isArray(value));

export const extractCmsPayloadMeta = (payload: unknown): CmsPayloadMeta | null => {
  if (!isRecord(payload)) {
    return null;
  }
  const title = typeof payload.title === "string" ? payload.title : undefined;
  const excerpt =
    typeof payload.excerpt === "string" || payload.excerpt === null ? payload.excerpt : undefined;
  const contentHtml = typeof payload.contentHtml === "string" ? payload.contentHtml : undefined;
  const contentText = typeof payload.contentText === "string" ? payload.contentText : undefined;
  const contentJson = payload.contentJson;

  return { title, excerpt, contentHtml, contentText, contentJson };
};

export const extractHtmlPayload = (payload: unknown): string | null => {
  if (typeof payload === "string") {
    return payload;
  }
  const meta = extractCmsPayloadMeta(payload);
  if (meta?.contentHtml) {
    return meta.contentHtml;
  }
  return null;
};

export const extractTextPayload = (payload: unknown): string | null => {
  const meta = extractCmsPayloadMeta(payload);
  if (meta?.contentText) {
    return meta.contentText;
  }
  return null;
};

export const extractBlocksPayload = (payload: unknown): WebsiteBlock[] => {
  if (Array.isArray(payload)) {
    return payload.filter((item) => typeof item === "object") as WebsiteBlock[];
  }
  if (isRecord(payload) && Array.isArray(payload.blocks)) {
    return payload.blocks.filter((item) => typeof item === "object") as WebsiteBlock[];
  }
  return [];
};
