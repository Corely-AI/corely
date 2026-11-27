import type { CorelyLocale } from "@corely/contracts";
import en from "./locales/en.json";
import de from "./locales/de.json";
import vi from "./locales/vi.json";

export const resources = {
  en: { translation: en },
  de: { translation: de },
  vi: { translation: vi },
};

const loaders = {
  tr: () => import("./locales/tr.json"),
  pl: () => import("./locales/pl.json"),
  ru: () => import("./locales/ru.json"),
  "pt-PT": () => import("./locales/pt-PT.json"),
  it: () => import("./locales/it.json"),
  fr: () => import("./locales/fr.json"),
  es: () => import("./locales/es.json"),
};

export async function loadSharedCatalog(locale: CorelyLocale) {
  if (locale === "en" || locale === "de" || locale === "vi") {
    return resources[locale].translation;
  }
  return (await loaders[locale]()).default;
}
