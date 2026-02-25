import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import * as Localization from "expo-localization";
import en from "./locales/en.json";
import de from "./locales/de.json";
import vi from "./locales/vi.json";

export const supportedLanguages = ["en", "de", "vi"] as const;

export type SupportedLanguage = (typeof supportedLanguages)[number];

function getDeviceLocaleTag(): string {
  const localeFromList = Localization.getLocales?.()[0]?.languageTag;
  if (localeFromList) {
    return localeFromList;
  }
  return Localization.locale || "en";
}

export function normalizeLanguageTag(
  languageTag: string | null | undefined
): SupportedLanguage | null {
  if (!languageTag) {
    return null;
  }

  const normalized = languageTag.toLowerCase().replace("_", "-");
  const languageCode = normalized.split("-")[0];
  if (supportedLanguages.includes(languageCode as SupportedLanguage)) {
    return languageCode as SupportedLanguage;
  }

  return null;
}

export function resolveDeviceLanguage(): SupportedLanguage {
  return normalizeLanguageTag(getDeviceLocaleTag()) ?? "en";
}

let initPromise: Promise<void> | null = null;

export async function initializeI18n(preferredLanguage?: string | null): Promise<typeof i18n> {
  if (!initPromise) {
    initPromise = i18n
      .use(initReactI18next)
      .init({
        compatibilityJSON: "v4",
        resources: {
          en: { translation: en },
          de: { translation: de },
          vi: { translation: vi },
        },
        fallbackLng: "en",
        interpolation: {
          escapeValue: false,
        },
      })
      .then(() => undefined);
  }

  await initPromise;

  const resolvedLanguage = normalizeLanguageTag(preferredLanguage) ?? resolveDeviceLanguage();
  if (i18n.language !== resolvedLanguage) {
    await i18n.changeLanguage(resolvedLanguage);
  }

  return i18n;
}

if (!i18n.isInitialized) {
  void initializeI18n();
}

export async function setI18nLanguage(language: string): Promise<void> {
  const resolvedLanguage = normalizeLanguageTag(language) ?? "en";
  if (!i18n.isInitialized) {
    await initializeI18n(resolvedLanguage);
    return;
  }
  if (i18n.language !== resolvedLanguage) {
    await i18n.changeLanguage(resolvedLanguage);
  }
}

export function getI18nLanguage(): SupportedLanguage {
  return normalizeLanguageTag(i18n.resolvedLanguage ?? i18n.language) ?? "en";
}

export function getLanguageLocaleTag(language: SupportedLanguage): string {
  switch (language) {
    case "de":
      return "de-DE";
    case "vi":
      return "vi-VN";
    default:
      return "en-US";
  }
}

export default i18n;
