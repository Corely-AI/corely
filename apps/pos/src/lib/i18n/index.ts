import {
  corelyLocaleDetails,
  corelyLocales,
  normalizeCorelyLocale,
  type CorelyLocale,
} from "@corely/contracts";
import tr from "./locales/tr.json";
import pl from "./locales/pl.json";
import ru from "./locales/ru.json";
import ptPT from "./locales/pt-PT.json";
import it from "./locales/it.json";
import fr from "./locales/fr.json";
import es from "./locales/es.json";
import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import * as Localization from "expo-localization";
import en from "./locales/en.json";
import de from "./locales/de.json";
import vi from "./locales/vi.json";

export const supportedLanguages = corelyLocales;

export type SupportedLanguage = CorelyLocale;

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
  return normalizeCorelyLocale(languageTag) ?? null;
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
          tr: { translation: tr },
          pl: { translation: pl },
          ru: { translation: ru },
          "pt-PT": { translation: ptPT },
          it: { translation: it },
          fr: { translation: fr },
          es: { translation: es },
        },
        load: "currentOnly",
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
  return corelyLocaleDetails[language].format;
}

export default i18n;
