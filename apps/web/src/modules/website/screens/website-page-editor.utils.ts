import type {
  WebsiteBlock,
  WebsiteBlockType,
  WebsitePageContent,
  WebsitePageStatus,
} from "@corely/contracts";
import { WebsitePageContentSchema } from "@corely/contracts";
import {
  WebsiteBlockEditorRegistry,
  WebsiteTemplateEditorRegistry,
} from "../blocks/website-block-editor-registry";

export const statusVariant = (status: WebsitePageStatus) => {
  switch (status) {
    case "PUBLISHED":
      return "success";
    default:
      return "warning";
  }
};

export const createBlockId = (type: WebsiteBlockType): string =>
  `${type}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

export const cloneContent = (content: WebsitePageContent): WebsitePageContent => {
  const cloned = JSON.parse(JSON.stringify(content)) as unknown;
  const parsed = WebsitePageContentSchema.safeParse(cloned);
  return parsed.success ? parsed.data : content;
};

export const areContentsEqual = (left: WebsitePageContent, right: WebsitePageContent): boolean =>
  JSON.stringify(left) === JSON.stringify(right);

export const getValueAtPath = (source: unknown, path: string): unknown => {
  const segments = path.split(".");
  let cursor = source;
  for (const segment of segments) {
    if (!cursor || typeof cursor !== "object" || Array.isArray(cursor)) {
      return undefined;
    }
    cursor = (cursor as Record<string, unknown>)[segment];
  }
  return cursor;
};

export const setValueAtPath = (
  source: Record<string, unknown>,
  path: string,
  value: unknown
): Record<string, unknown> => {
  const segments = path.split(".");
  const root: Record<string, unknown> = { ...source };
  let cursor: Record<string, unknown> = root;

  for (let index = 0; index < segments.length; index += 1) {
    const segment = segments[index];
    if (!segment) {
      continue;
    }
    const isLast = index === segments.length - 1;

    if (isLast) {
      if (value === undefined || value === null || value === "") {
        delete cursor[segment];
      } else {
        cursor[segment] = value;
      }
      continue;
    }

    const existing = cursor[segment];
    const next =
      existing && typeof existing === "object" && !Array.isArray(existing)
        ? { ...(existing as Record<string, unknown>) }
        : {};
    cursor[segment] = next;
    cursor = next;
  }

  return root;
};

export const normalizeFileIdList = (value: unknown): string[] => {
  if (!Array.isArray(value)) {
    return [];
  }
  return value
    .map((item) => (typeof item === "string" ? item.trim() : ""))
    .filter((item) => item.length > 0);
};

export const stringifyJsonField = (value: unknown): string => {
  if (value === undefined) {
    return "";
  }
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return "";
  }
};

export const asNonEmptyString = (value: unknown): string | undefined =>
  typeof value === "string" && value.trim().length > 0 ? value.trim() : undefined;

export const asStringList = (value: unknown): string[] => {
  if (!Array.isArray(value)) {
    return [];
  }
  return value
    .map((item) => asNonEmptyString(item))
    .filter((item): item is string => Boolean(item));
};

export const reorderBlocks = (
  blocks: WebsiteBlock[],
  sourceId: string,
  targetId: string
): WebsiteBlock[] => {
  if (sourceId === targetId) {
    return blocks;
  }

  const sourceIndex = blocks.findIndex((block) => block.id === sourceId);
  const targetIndex = blocks.findIndex((block) => block.id === targetId);
  if (sourceIndex < 0 || targetIndex < 0) {
    return blocks;
  }

  const next = [...blocks];
  const [moved] = next.splice(sourceIndex, 1);
  if (!moved) {
    return blocks;
  }
  next.splice(targetIndex, 0, moved);
  return next;
};

export const buildPreviewToken = (): string =>
  `preview_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 12)}`;

export const openWebsitePreviewWindow = (previewUrl: string): void => {
  const token = buildPreviewToken();
  const separator = previewUrl.includes("?") ? "&" : "?";
  window.open(`${previewUrl}${separator}preview=1&token=${encodeURIComponent(token)}`, "_blank");
};

export const applyTemplateBlockDefaults = (block: WebsiteBlock): WebsiteBlock => {
  const definition = WebsiteBlockEditorRegistry.get(block.type);
  const candidate: WebsiteBlock = {
    ...block,
    props: {
      ...definition.defaultProps,
      ...((block.props as Record<string, unknown>) ?? {}),
    },
  };
  const parsed = definition.schema.safeParse(candidate);
  return parsed.success ? parsed.data : candidate;
};

export const buildDefaultContentForTemplate = (templateKey: string): WebsitePageContent => {
  const templateDefinition =
    WebsiteTemplateEditorRegistry.get(templateKey.trim()) ??
    WebsiteTemplateEditorRegistry.fallback();
  const base = templateDefinition.defaultContent();
  const content: WebsitePageContent = {
    ...base,
    templateKey: templateDefinition.templateKey,
    templateVersion: base.templateVersion ?? templateDefinition.version,
    blocks: base.blocks.map(applyTemplateBlockDefaults),
  };
  return cloneContent(content);
};

const normalizeTemplateSegment = (value: string): string =>
  value
    .replace(/([a-z0-9])([A-Z])/g, "$1-$2")
    .replace(/[^a-zA-Z0-9]+/g, "-")
    .toLowerCase()
    .replace(/^-+|-+$/g, "");

export const suggestPathBaseFromTemplate = (templateKey: string): string => {
  const trimmed = templateKey.trim();
  const segments = trimmed.split(".");
  const candidate =
    normalizeTemplateSegment(segments[1] ?? "") ||
    normalizeTemplateSegment(segments[0] ?? "") ||
    "page";
  return `/${candidate}`;
};

export const buildUniqueWebsitePath = (
  basePath: string,
  existingPaths: ReadonlySet<string>
): string => {
  const normalizedBase = basePath.startsWith("/") ? basePath : `/${basePath}`;
  if (!existingPaths.has(normalizedBase)) {
    return normalizedBase;
  }

  for (let index = 2; index < 5000; index += 1) {
    const candidate = `${normalizedBase}-${index}`;
    if (!existingPaths.has(candidate)) {
      return candidate;
    }
  }

  return `${normalizedBase}-${Date.now().toString(36)}`;
};
