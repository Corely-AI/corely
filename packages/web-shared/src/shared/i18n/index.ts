import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import { resources } from "./resources";

const savedLanguage = localStorage.getItem("Corely One ERP-language") || "en";

void i18n.use(initReactI18next).init({
  resources,
  lng: savedLanguage,
  fallbackLng: "en",
  interpolation: {
    escapeValue: false,
  },
});

export default i18n;
