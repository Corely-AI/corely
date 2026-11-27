import { resolveCorelyLocale, type CorelyLocale } from "@corely/contracts";
import tr from "./i18n/locales/tr.json";
import pl from "./i18n/locales/pl.json";
import ru from "./i18n/locales/ru.json";
import ptPT from "./i18n/locales/pt-PT.json";
import it from "./i18n/locales/it.json";
import fr from "./i18n/locales/fr.json";
import es from "./i18n/locales/es.json";
import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import en from "./i18n/locales/en.json";
import vi from "./i18n/locales/vi.json";
import de from "./i18n/locales/de.json";

const preferenceKey = "Corely Portal-language";
const savedLanguage = resolveCorelyLocale(localStorage.getItem(preferenceKey), navigator.language);

void i18n.use(initReactI18next).init({
  resources: {
    en: { translation: en },
    vi: { translation: vi },
    de: { translation: de },
    tr: { translation: tr },
    pl: { translation: pl },
    ru: { translation: ru },
    "pt-PT": { translation: ptPT },
    it: { translation: it },
    fr: { translation: fr },
    es: { translation: es },
  },
  lng: savedLanguage,
  load: "currentOnly",
  fallbackLng: "en",
  interpolation: {
    escapeValue: false,
  },
});

document.documentElement.lang = savedLanguage;

export function setPortalLanguage(locale: CorelyLocale) {
  document.documentElement.lang = locale;
  localStorage.setItem(preferenceKey, locale);
  void i18n.changeLanguage(locale);
}

export default i18n;
