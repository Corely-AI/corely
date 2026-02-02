import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import * as Localization from "expo-localization";
import en from "./locales/en.json";
import de from "./locales/de.json";
import vi from "./locales/vi.json";

const supportedLanguages = ["en", "de", "vi"] as const;

type SupportedLanguage = (typeof supportedLanguages)[number];

function resolveInitialLanguage(): SupportedLanguage {
  const deviceLocale = Localization.locale || "en";
  const languageCode = deviceLocale.split("-")[0];
  if (supportedLanguages.includes(languageCode as SupportedLanguage)) {
    return languageCode as SupportedLanguage;
  }
  return "en";
}

if (!i18n.isInitialized) {
  void i18n.use(initReactI18next).init({
    resources: {
      en: { translation: en },
      de: { translation: de },
      vi: { translation: vi },
    },
    lng: resolveInitialLanguage(),
    fallbackLng: "en",
    interpolation: {
      escapeValue: false,
    },
  });
}

export default i18n;
