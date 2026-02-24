import type { WebsitePageContent } from "@corely/contracts";
import { WebsitePageContentSchema } from "@corely/contracts";
import { z } from "zod";
import type { WebsitePageEditorPresetDefinition } from "./website-page-editor-preset-registry";

export const WEBSITE_PAGE_PRESETS_CUSTOM_KEY = "website.pagePresets";

const SiteStoredPagePresetSchema = z
  .object({
    presetKey: z.string().min(1).max(120),
    label: z.string().min(1).max(160),
    description: z.string().max(320).optional(),
    templateKey: z.string().min(1).max(120),
    suggestedPathBase: z.string().min(1).max(240).optional(),
    defaultLocale: z.string().min(2).max(16).optional(),
    content: WebsitePageContentSchema,
    updatedAt: z.string().datetime({ offset: true }),
  })
  .strict();

const SiteStoredPagePresetListSchema = z.array(SiteStoredPagePresetSchema).max(100);

export type SiteStoredPagePreset = z.infer<typeof SiteStoredPagePresetSchema>;

const isRecord = (value: unknown): value is Record<string, unknown> =>
  Boolean(value) && typeof value === "object" && !Array.isArray(value);

export const normalizePresetSlug = (value: string): string =>
  value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);

export const normalizePresetKeyInput = (value: string): string =>
  value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9._-]/g, "-")
    .replace(/-+/g, "-")
    .replace(/\.+/g, ".")
    .replace(/^-+|-+$/g, "");

export const createPresetKeyFromLabel = (label: string): string => {
  const slug = normalizePresetSlug(label) || "preset";
  return `custom.${slug}.v1`;
};

export const readSiteStoredPagePresets = (customSettings: unknown): SiteStoredPagePreset[] => {
  if (!isRecord(customSettings)) {
    return [];
  }
  const raw = customSettings[WEBSITE_PAGE_PRESETS_CUSTOM_KEY];
  const parsed = SiteStoredPagePresetListSchema.safeParse(raw);
  return parsed.success ? parsed.data : [];
};

export const toSitePresetDefinitions = (
  customSettings: unknown
): WebsitePageEditorPresetDefinition[] => {
  const storedPresets = readSiteStoredPagePresets(customSettings);
  return storedPresets.map((preset) => ({
    presetKey: preset.presetKey,
    label: preset.label,
    description: preset.description ?? "Custom preset",
    templateKey: preset.templateKey,
    suggestedPathBase: preset.suggestedPathBase ?? "/page",
    defaultLocale: preset.defaultLocale ?? "en-US",
    defaultContent: () =>
      WebsitePageContentSchema.parse(JSON.parse(JSON.stringify(preset.content)) as unknown),
  }));
};

export const mergePresetDefinitions = (
  builtInPresets: WebsitePageEditorPresetDefinition[],
  sitePresets: WebsitePageEditorPresetDefinition[]
): WebsitePageEditorPresetDefinition[] => {
  const builtInKeys = new Set(builtInPresets.map((preset) => preset.presetKey));
  return [...builtInPresets, ...sitePresets.filter((preset) => !builtInKeys.has(preset.presetKey))];
};

export const upsertSiteStoredPreset = (input: {
  customSettings: unknown;
  preset: {
    presetKey: string;
    label: string;
    description?: string;
    templateKey: string;
    suggestedPathBase?: string;
    defaultLocale?: string;
    content: WebsitePageContent;
    updatedAt: string;
  };
}): { nextCustomSettings: Record<string, unknown>; savedPreset: SiteStoredPagePreset } => {
  const baseCustom = isRecord(input.customSettings) ? { ...input.customSettings } : {};
  const existing = readSiteStoredPagePresets(baseCustom);
  const validatedContent = WebsitePageContentSchema.parse(
    JSON.parse(JSON.stringify(input.preset.content)) as unknown
  );

  const candidate: SiteStoredPagePreset = SiteStoredPagePresetSchema.parse({
    presetKey: input.preset.presetKey,
    label: input.preset.label,
    description: input.preset.description,
    templateKey: input.preset.templateKey,
    suggestedPathBase: input.preset.suggestedPathBase,
    defaultLocale: input.preset.defaultLocale,
    content: validatedContent,
    updatedAt: input.preset.updatedAt,
  });

  const nextList = [...existing];
  const index = nextList.findIndex((item) => item.presetKey === candidate.presetKey);
  if (index >= 0) {
    nextList[index] = candidate;
  } else {
    nextList.push(candidate);
  }

  const nextCustomSettings: Record<string, unknown> = {
    ...baseCustom,
    [WEBSITE_PAGE_PRESETS_CUSTOM_KEY]: SiteStoredPagePresetListSchema.parse(nextList),
  };

  return { nextCustomSettings, savedPreset: candidate };
};
