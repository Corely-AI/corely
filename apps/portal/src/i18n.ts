import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import en from "./i18n/locales/en.json";
import vi from "./i18n/locales/vi.json";

const savedLanguage = localStorage.getItem("Corely Portal-language") || "en";

void i18n.use(initReactI18next).init({
  resources: {
    en: { translation: en },
    vi: { translation: vi },
  },
  lng: savedLanguage,
  fallbackLng: "en",
  interpolation: {
    escapeValue: false,
  },
});

export default i18n;
