import { ValidationError } from "@corely/kernel";
import { WebsiteExternalContentKeySchema, type WebsiteExternalContentKey } from "@corely/contracts";
import { normalizeLocale } from "../website.validators";

export const WEBSITE_EXTERNAL_CONTENT_DRAFT_SETTINGS_KEY = "website.externalContentDraft";
export const WEBSITE_EXTERNAL_CONTENT_PUBLISHED_SETTINGS_KEY = "website.externalContentPublished";
export const WEBSITE_EXTERNAL_CONTENT_DEFAULT_LOCALE_SLOT = "default";

export type WebsiteExternalContentStorage = Record<
  WebsiteExternalContentKey,
  Record<string, unknown>
>;

const WEBSITE_EXTERNAL_CONTENT_KEYS = WebsiteExternalContentKeySchema.options;

const isPlainObject = (value: unknown): value is Record<string, unknown> =>
  Boolean(value) && typeof value === "object" && !Array.isArray(value);

export const normalizeWebsiteExternalContentLocale = (locale?: string): string | undefined => {
  if (typeof locale !== "string") {
    return undefined;
  }
  const trimmed = locale.trim();
  if (!trimmed) {
    return undefined;
  }
  return normalizeLocale(trimmed);
};

export const toWebsiteExternalContentLocaleSlot = (locale?: string): string =>
  normalizeWebsiteExternalContentLocale(locale) ?? WEBSITE_EXTERNAL_CONTENT_DEFAULT_LOCALE_SLOT;

export const normalizeWebsiteExternalContentKey = (value: unknown): WebsiteExternalContentKey => {
  const parsed = WebsiteExternalContentKeySchema.safeParse(value);
  if (!parsed.success) {
    throw new ValidationError(
      "external content key is invalid",
      undefined,
      "Website:InvalidExternalContentKey"
    );
  }
  return parsed.data;
};

export const readWebsiteExternalContentStorage = (
  value: unknown
): WebsiteExternalContentStorage => {
  const emptyStorage = WEBSITE_EXTERNAL_CONTENT_KEYS.reduce(
    (acc, key) => ({ ...acc, [key]: {} }),
    {} as WebsiteExternalContentStorage
  );

  if (!isPlainObject(value)) {
    return emptyStorage;
  }

  for (const key of WEBSITE_EXTERNAL_CONTENT_KEYS) {
    const keyValue = value[key];
    if (!isPlainObject(keyValue)) {
      continue;
    }
    const nextLocales: Record<string, unknown> = {};
    for (const [locale, localeValue] of Object.entries(keyValue)) {
      if (locale.trim().length > 0) {
        nextLocales[locale] = localeValue;
      }
    }
    emptyStorage[key] = nextLocales;
  }

  return emptyStorage;
};

export const getWebsiteExternalContentValue = (input: {
  storage: WebsiteExternalContentStorage;
  key: WebsiteExternalContentKey;
  localeSlot: string;
}): unknown =>
  input.storage[input.key][input.localeSlot] ??
  input.storage[input.key][WEBSITE_EXTERNAL_CONTENT_DEFAULT_LOCALE_SLOT];

export const setWebsiteExternalContentValue = (input: {
  storage: WebsiteExternalContentStorage;
  key: WebsiteExternalContentKey;
  localeSlot: string;
  data: unknown;
}): WebsiteExternalContentStorage => {
  const nextStorage: WebsiteExternalContentStorage = { ...input.storage };
  const nextLocaleMap = { ...nextStorage[input.key] };
  nextLocaleMap[input.localeSlot] = input.data;
  nextStorage[input.key] = nextLocaleMap;
  return nextStorage;
};
