import i18n, { type BackendModule } from "i18next";
import { initReactI18next } from "react-i18next";
import { loadSharedCatalog, resources } from "./resources";
import { corelyLocales, resolveCorelyLocale } from "@corely/contracts";
import { loadFocusedLocale } from "../../session/focused-locale";

const language = loadFocusedLocale();

const catalogBackend: BackendModule = {
  type: "backend",
  init() {},
  read(locale, _namespace, callback) {
    void loadSharedCatalog(resolveCorelyLocale(locale)).then(
      (catalog) => callback(null, catalog),
      (error: Error) => callback(error, false)
    );
  },
};

void i18n
  .use(catalogBackend)
  .use(initReactI18next)
  .init({
    resources,
    partialBundledLanguages: true,
    supportedLngs: [...corelyLocales],
    lng: language,
    load: "currentOnly",
    fallbackLng: "en",
    interpolation: {
      escapeValue: false,
    },
  });
document.documentElement.lang = language;

export default i18n;
