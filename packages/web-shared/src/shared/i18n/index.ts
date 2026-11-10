import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import en from "./locales/en.json";
import de from "./locales/de.json";
import vi from "./locales/vi.json";
import { resolveFocusedLocale } from "../../session/focused-locale";

let savedLanguage: string | null = null;
try {
  savedLanguage = localStorage.getItem("Corely One ERP-language");
} catch {
  /* Browser fallback remains available. */
}
const language = resolveFocusedLocale(
  savedLanguage,
  navigator.language,
  new URLSearchParams(location.search).get("lang")
);

void i18n.use(initReactI18next).init({
  resources: {
    en: { translation: en },
    de: { translation: de },
    vi: { translation: vi },
  },
  lng: language,
  fallbackLng: "en",
  interpolation: {
    escapeValue: false,
  },
});
document.documentElement.lang = language;

export default i18n;
