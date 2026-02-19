import {
  WebsiteSiteCommonSettingsSchema,
  WebsiteSiteCustomSettingsSchema,
  WebsiteSiteThemeSettingsSchema,
  type WebsiteSiteCommonSettings,
  type WebsiteSiteCustomSettings,
  type WebsiteSiteSettings,
  type WebsiteSiteThemeSettings,
} from "@corely/contracts";

export const WEBSITE_SITE_SETTINGS_ENTITY_TYPE = "WebsiteSite";

const isPlainObject = (value: unknown): value is Record<string, unknown> =>
  Boolean(value) && typeof value === "object" && !Array.isArray(value);

const readOptionalString = (value: unknown): string | undefined => {
  if (typeof value !== "string") {
    return undefined;
  }
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
};

const normalizeAsset = (
  value: unknown,
  legacy: { fileId?: unknown; url?: unknown; alt?: unknown }
): Record<string, string> => {
  const current = isPlainObject(value) ? value : {};
  const fileId = readOptionalString(current.fileId) ?? readOptionalString(legacy.fileId);
  const url = readOptionalString(current.url) ?? readOptionalString(legacy.url);
  const alt = readOptionalString(current.alt) ?? readOptionalString(legacy.alt);

  const next: Record<string, string> = {};
  if (fileId) {
    next.fileId = fileId;
  }
  if (url) {
    next.url = url;
  }
  if (alt) {
    next.alt = alt;
  }

  return next;
};

const applyLegacyCommonSettingsAliases = (
  input: Record<string, unknown>
): Record<string, unknown> => {
  const next: Record<string, unknown> = { ...input };

  const siteTitle = readOptionalString(next.siteTitle) ?? readOptionalString(next.brandName);
  if (siteTitle) {
    next.siteTitle = siteTitle;
  }

  const siteSubtitle = readOptionalString(next.siteSubtitle) ?? readOptionalString(next.tagline);
  if (siteSubtitle) {
    next.siteSubtitle = siteSubtitle;
  }

  const logo = normalizeAsset(next.logo, {
    fileId: next.logoFileId,
    url: next.logoUrl,
    alt: next.logoAlt,
  });
  if (Object.keys(logo).length > 0) {
    next.logo = logo;
  }

  const favicon = normalizeAsset(next.favicon, {
    fileId: next.faviconFileId,
    url: next.faviconUrl,
  });
  if (Object.keys(favicon).length > 0) {
    next.favicon = favicon;
  }

  return next;
};

const resolveSiteTitleFallback = (siteTitleFallback: string): string => {
  const trimmed = siteTitleFallback.trim();
  return trimmed.length > 0 ? trimmed : "Website";
};

export const parseWebsiteSiteCommonSettingsForWrite = (
  input: unknown,
  siteTitleFallback: string
): WebsiteSiteCommonSettings => {
  const fallbackTitle = resolveSiteTitleFallback(siteTitleFallback);

  if (input === undefined || input === null) {
    return WebsiteSiteCommonSettingsSchema.parse({ siteTitle: fallbackTitle });
  }

  if (!isPlainObject(input)) {
    return WebsiteSiteCommonSettingsSchema.parse(input);
  }

  const normalizedInput = applyLegacyCommonSettingsAliases(input);
  const rawSiteTitle = normalizedInput.siteTitle;
  const shouldApplyFallback =
    rawSiteTitle === undefined ||
    rawSiteTitle === null ||
    (typeof rawSiteTitle === "string" && rawSiteTitle.trim().length === 0);

  return WebsiteSiteCommonSettingsSchema.parse({
    ...normalizedInput,
    siteTitle: shouldApplyFallback ? fallbackTitle : rawSiteTitle,
  });
};

export const normalizeWebsiteSiteCommonSettings = (
  input: unknown,
  siteTitleFallback: string
): WebsiteSiteCommonSettings => {
  const fallbackTitle = resolveSiteTitleFallback(siteTitleFallback);

  if (!isPlainObject(input)) {
    return WebsiteSiteCommonSettingsSchema.parse({ siteTitle: fallbackTitle });
  }

  const normalizedInput = applyLegacyCommonSettingsAliases(input);
  const rawSiteTitle = normalizedInput.siteTitle;
  const shouldApplyFallback =
    rawSiteTitle === undefined ||
    rawSiteTitle === null ||
    (typeof rawSiteTitle === "string" && rawSiteTitle.trim().length === 0);

  const parsed = WebsiteSiteCommonSettingsSchema.safeParse({
    ...normalizedInput,
    siteTitle: shouldApplyFallback ? fallbackTitle : rawSiteTitle,
  });

  if (parsed.success) {
    return parsed.data;
  }

  return WebsiteSiteCommonSettingsSchema.parse({ siteTitle: fallbackTitle });
};

export const parseWebsiteSiteThemeSettingsForWrite = (
  input: unknown
): WebsiteSiteThemeSettings => {
  if (input === undefined || input === null) {
    return WebsiteSiteThemeSettingsSchema.parse({});
  }
  return WebsiteSiteThemeSettingsSchema.parse(input);
};

export const normalizeWebsiteSiteThemeSettings = (input: unknown): WebsiteSiteThemeSettings => {
  const parsed = WebsiteSiteThemeSettingsSchema.safeParse(input ?? {});
  return parsed.success ? parsed.data : WebsiteSiteThemeSettingsSchema.parse({});
};

export const parseWebsiteSiteCustomSettingsForWrite = (
  input: unknown
): WebsiteSiteCustomSettings => WebsiteSiteCustomSettingsSchema.parse(input ?? {});

export const normalizeWebsiteSiteCustomSettings = (
  input: unknown
): WebsiteSiteCustomSettings => {
  const parsed = WebsiteSiteCustomSettingsSchema.safeParse(input ?? {});
  return parsed.success ? parsed.data : WebsiteSiteCustomSettingsSchema.parse({});
};

export const buildWebsiteSiteSettings = (input: {
  siteName: string;
  brandingJson: unknown;
  themeJson: unknown;
  custom: unknown;
}): WebsiteSiteSettings => {
  const common = normalizeWebsiteSiteCommonSettings(input.brandingJson, input.siteName);
  const theme = normalizeWebsiteSiteThemeSettings(input.themeJson);
  const custom = normalizeWebsiteSiteCustomSettings(input.custom);

  return {
    common,
    theme,
    custom,
  };
};
