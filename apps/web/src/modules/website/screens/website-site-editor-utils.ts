import {
  WebsiteSiteCommonSettingsSchema,
  WebsiteSiteCustomSettingsSchema,
  WebsiteSiteThemeSettingsSchema,
  type WebsiteSiteCommonSettings,
  type WebsiteSiteThemeSettings,
} from "@corely/contracts";

const CUSTOM_KEY_REGEX = /^[a-z][a-z0-9._-]*$/;
const CTA_VARIANTS = ["primary", "secondary", "outline", "ghost"] as const;

export const DEFAULT_COMMON_SETTINGS = WebsiteSiteCommonSettingsSchema.parse({
  siteTitle: "Website",
});
export const DEFAULT_THEME_SETTINGS = WebsiteSiteThemeSettingsSchema.parse({});

export type CustomPropertyRow = {
  id: string;
  key: string;
  valueText: string;
};

const isPlainObject = (value: unknown): value is Record<string, unknown> =>
  Boolean(value) && typeof value === "object" && !Array.isArray(value);

export const normalizeCtaVariant = (
  value: string | undefined
): (typeof CTA_VARIANTS)[number] | undefined => {
  if (!value) {
    return undefined;
  }
  const normalized = value.trim().toLowerCase();
  return CTA_VARIANTS.find((variant) => variant === normalized);
};

export const createRowId = () => `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

export const slugify = (value: string) =>
  value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .substring(0, 80);

export const normalizeCommonSettings = (
  value: unknown,
  fallbackSiteTitle: string
): WebsiteSiteCommonSettings => {
  const siteTitle = fallbackSiteTitle.trim() || "Website";
  if (!isPlainObject(value)) {
    return WebsiteSiteCommonSettingsSchema.parse({ siteTitle });
  }

  const candidate = {
    ...value,
    siteTitle:
      typeof value.siteTitle === "string" && value.siteTitle.trim().length > 0
        ? value.siteTitle
        : siteTitle,
  };

  const parsed = WebsiteSiteCommonSettingsSchema.safeParse(candidate);
  return parsed.success ? parsed.data : WebsiteSiteCommonSettingsSchema.parse({ siteTitle });
};

export const normalizeThemeSettings = (value: unknown): WebsiteSiteThemeSettings => {
  const parsed = WebsiteSiteThemeSettingsSchema.safeParse(value ?? {});
  return parsed.success ? parsed.data : WebsiteSiteThemeSettingsSchema.parse({});
};

export const toCustomRows = (value: unknown): CustomPropertyRow[] => {
  if (!isPlainObject(value)) {
    return [];
  }

  return Object.entries(value).map(([key, item]) => ({
    id: createRowId(),
    key,
    valueText: JSON.stringify(item, null, 2),
  }));
};

export const parseCustomRows = (rows: CustomPropertyRow[]) => {
  const rowErrors: Record<string, string> = {};
  const custom: Record<string, unknown> = {};
  const usedKeys = new Set<string>();

  for (const row of rows) {
    const key = row.key.trim();
    const valueText = row.valueText.trim();

    if (!key && !valueText) {
      continue;
    }

    if (!key) {
      rowErrors[row.id] = "Key is required.";
      continue;
    }

    if (!CUSTOM_KEY_REGEX.test(key)) {
      rowErrors[row.id] = "Key must be slug-like (letters, numbers, dot, underscore, dash).";
      continue;
    }

    if (usedKeys.has(key)) {
      rowErrors[row.id] = "Duplicate key.";
      continue;
    }

    if (!valueText) {
      rowErrors[row.id] = "JSON value is required.";
      continue;
    }

    try {
      custom[key] = JSON.parse(valueText);
    } catch {
      rowErrors[row.id] = "Invalid JSON value.";
      continue;
    }

    usedKeys.add(key);
  }

  const customValidation = WebsiteSiteCustomSettingsSchema.safeParse(custom);
  return {
    rowErrors,
    custom: customValidation.success ? customValidation.data : null,
    customError: customValidation.success ? null : customValidation.error.issues[0]?.message,
  };
};

export const sanitizeCommonSettingsForSave = (
  value: WebsiteSiteCommonSettings
): WebsiteSiteCommonSettings => {
  const ctaLabel = value.header?.cta?.label?.trim() ?? "";
  const ctaHref = value.header?.cta?.href?.trim() ?? "";
  const hasCta = ctaLabel.length > 0 && ctaHref.length > 0;

  const footerLinks = (value.footer?.links ?? [])
    .map((link) => ({
      label: link.label.trim(),
      href: link.href.trim(),
    }))
    .filter((link) => link.label.length > 0 && link.href.length > 0);

  return {
    ...value,
    siteTitle: value.siteTitle.trim(),
    siteSubtitle: value.siteSubtitle?.trim() || undefined,
    header: {
      ...value.header,
      showLogo: value.header?.showLogo ?? true,
      cta: hasCta
        ? {
            ...value.header?.cta,
            label: ctaLabel,
            href: ctaHref,
            variant: normalizeCtaVariant(value.header?.cta?.variant),
          }
        : undefined,
    },
    footer: {
      ...value.footer,
      copyrightText: value.footer?.copyrightText?.trim() || undefined,
      links: footerLinks,
    },
    socials: {
      youtube: value.socials?.youtube?.trim() || undefined,
      instagram: value.socials?.instagram?.trim() || undefined,
      tiktok: value.socials?.tiktok?.trim() || undefined,
      x: value.socials?.x?.trim() || undefined,
      linkedin: value.socials?.linkedin?.trim() || undefined,
      facebook: value.socials?.facebook?.trim() || undefined,
      email: value.socials?.email?.trim() || undefined,
    },
    seoDefaults: {
      titleTemplate: value.seoDefaults?.titleTemplate?.trim() || undefined,
      defaultDescription: value.seoDefaults?.defaultDescription?.trim() || undefined,
    },
    logo: {
      fileId: value.logo?.fileId?.trim() || undefined,
      url: value.logo?.url?.trim() || undefined,
      alt: value.logo?.alt?.trim() || undefined,
    },
    favicon: {
      fileId: value.favicon?.fileId?.trim() || undefined,
      url: value.favicon?.url?.trim() || undefined,
    },
  };
};

export const sanitizeThemeSettingsForSave = (
  value: WebsiteSiteThemeSettings
): WebsiteSiteThemeSettings => ({
  ...value,
  colors: {
    primary: value.colors?.primary?.trim() || undefined,
    accent: value.colors?.accent?.trim() || undefined,
    background: value.colors?.background?.trim() || undefined,
    text: value.colors?.text?.trim() || undefined,
  },
  typography: {
    headingFont: value.typography?.headingFont?.trim() || undefined,
    bodyFont: value.typography?.bodyFont?.trim() || undefined,
  },
  radius: value.radius?.trim() || undefined,
});
