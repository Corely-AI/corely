import { z } from "zod";

const WEBSITE_SITE_URL_SCHEMA = z.string().min(1).max(2048);
const WEBSITE_SITE_EMAIL_SCHEMA = z.string().email().max(320);

const MAX_JSON_DEPTH = 20;
const FORBIDDEN_JSON_KEYS = new Set(["__proto__", "prototype", "constructor"]);

export const WEBSITE_SITE_CUSTOM_SETTINGS_MAX_BYTES = 1024 * 1024;

const isPlainObject = (value: unknown): value is Record<string, unknown> =>
  Boolean(value) && typeof value === "object" && !Array.isArray(value);

const isJsonSafeValue = (value: unknown, depth = 0): boolean => {
  if (depth > MAX_JSON_DEPTH) {
    return false;
  }

  if (value === null) {
    return true;
  }

  if (typeof value === "string" || typeof value === "boolean") {
    return true;
  }

  if (typeof value === "number") {
    return Number.isFinite(value);
  }

  if (Array.isArray(value)) {
    return value.every((item) => isJsonSafeValue(item, depth + 1));
  }

  if (!isPlainObject(value)) {
    return false;
  }

  for (const [key, nested] of Object.entries(value)) {
    if (FORBIDDEN_JSON_KEYS.has(key)) {
      return false;
    }
    if (!isJsonSafeValue(nested, depth + 1)) {
      return false;
    }
  }

  return true;
};

const utf8ByteLength = (value: string): number => {
  let bytes = 0;

  for (let index = 0; index < value.length; index += 1) {
    const code = value.charCodeAt(index);
    if (code < 0x80) {
      bytes += 1;
      continue;
    }
    if (code < 0x800) {
      bytes += 2;
      continue;
    }
    if (code >= 0xd800 && code <= 0xdbff) {
      bytes += 4;
      index += 1;
      continue;
    }
    bytes += 3;
  }

  return bytes;
};

const WebsiteSiteAssetSchema = z.object({
  fileId: z.string().min(1).optional(),
  url: WEBSITE_SITE_URL_SCHEMA.optional(),
  alt: z.string().min(1).max(240).optional(),
});

const WebsiteSiteFaviconSchema = z.object({
  fileId: z.string().min(1).optional(),
  url: WEBSITE_SITE_URL_SCHEMA.optional(),
});

const WebsiteSiteLinkSchema = z.object({
  label: z.string().min(1).max(120),
  href: WEBSITE_SITE_URL_SCHEMA,
});

const WebsiteSiteHeaderCtaSchema = z.object({
  label: z.string().min(1).max(120),
  href: WEBSITE_SITE_URL_SCHEMA,
  variant: z.enum(["primary", "secondary", "outline", "ghost"]).optional(),
});

export const WebsiteSiteSeoDefaultsSchema = z
  .object({
    titleTemplate: z.string().max(160).optional(),
    defaultDescription: z.string().max(320).optional(),
  })
  .default({});
export type WebsiteSiteSeoDefaults = z.infer<typeof WebsiteSiteSeoDefaultsSchema>;

const WebsiteSiteCommonSettingsCoreSchema = z
  .object({
    siteTitle: z.string().min(1).max(160),
    siteSubtitle: z.string().min(1).max(240).optional(),
    logo: WebsiteSiteAssetSchema.default({}),
    favicon: WebsiteSiteFaviconSchema.default({}),
    header: z
      .object({
        showLogo: z.boolean().default(true),
        cta: WebsiteSiteHeaderCtaSchema.optional(),
      })
      .default({ showLogo: true }),
    footer: z
      .object({
        copyrightText: z.string().max(280).optional(),
        links: z.array(WebsiteSiteLinkSchema).max(20).default([]),
      })
      .default({ links: [] }),
    socials: z
      .object({
        youtube: WEBSITE_SITE_URL_SCHEMA.optional(),
        instagram: WEBSITE_SITE_URL_SCHEMA.optional(),
        tiktok: WEBSITE_SITE_URL_SCHEMA.optional(),
        x: WEBSITE_SITE_URL_SCHEMA.optional(),
        linkedin: WEBSITE_SITE_URL_SCHEMA.optional(),
        facebook: WEBSITE_SITE_URL_SCHEMA.optional(),
        email: WEBSITE_SITE_EMAIL_SCHEMA.optional(),
      })
      .default({}),
    seoDefaults: WebsiteSiteSeoDefaultsSchema,
  })
  .passthrough();

export const WebsiteSiteCommonSettingsSchema = z.preprocess((value) => {
  if (!isPlainObject(value)) {
    return value;
  }

  const next: Record<string, unknown> = { ...value };

  if (!Object.prototype.hasOwnProperty.call(next, "seoDefaults") && next.seo !== undefined) {
    next.seoDefaults = next.seo;
  }

  return next;
}, WebsiteSiteCommonSettingsCoreSchema);
export type WebsiteSiteCommonSettings = z.infer<typeof WebsiteSiteCommonSettingsSchema>;

export const WebsiteSiteThemeSettingsSchema = z
  .object({
    colors: z
      .object({
        primary: z.string().max(40).optional(),
        accent: z.string().max(40).optional(),
        background: z.string().max(40).optional(),
        text: z.string().max(40).optional(),
      })
      .default({}),
    typography: z
      .object({
        headingFont: z.string().max(160).optional(),
        bodyFont: z.string().max(160).optional(),
      })
      .default({}),
    radius: z.string().max(32).optional(),
    tokens: z
      .record(
        z.string().min(1).max(120),
        z.union([z.string(), z.number().finite(), z.boolean(), z.null()])
      )
      .default({}),
  })
  .passthrough();
export type WebsiteSiteThemeSettings = z.infer<typeof WebsiteSiteThemeSettingsSchema>;

export const WebsiteSiteCustomSettingsSchema = z
  .record(z.string().min(1).max(120), z.unknown())
  .superRefine((value, ctx) => {
    for (const [key, nestedValue] of Object.entries(value)) {
      if (!isJsonSafeValue(nestedValue)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: [key],
          message: "Custom value must be JSON-safe.",
        });
      }
    }

    try {
      const bytes = utf8ByteLength(JSON.stringify(value));
      if (bytes > WEBSITE_SITE_CUSTOM_SETTINGS_MAX_BYTES) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `Custom settings exceed ${WEBSITE_SITE_CUSTOM_SETTINGS_MAX_BYTES} bytes.`,
        });
      }
    } catch {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Custom settings must be JSON-serializable.",
      });
    }
  });
export type WebsiteSiteCustomSettings = z.infer<typeof WebsiteSiteCustomSettingsSchema>;

export const WebsiteSiteSettingsSchema = z.object({
  common: WebsiteSiteCommonSettingsSchema,
  theme: WebsiteSiteThemeSettingsSchema,
  custom: WebsiteSiteCustomSettingsSchema,
});
export type WebsiteSiteSettings = z.infer<typeof WebsiteSiteSettingsSchema>;
