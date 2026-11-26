import messages from "./locales/i18n.json";
import {
  corelyLocaleDetails,
  corelyLocales,
  normalizeCorelyLocale,
  resolveCorelyLocale,
  type OpenBukLocale,
} from "@corely/contracts";
import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from "react";

export const languageNames: Partial<Record<OpenBukLocale, string>> = {
  ...Object.fromEntries(corelyLocales.map((locale) => [locale, corelyLocaleDetails[locale].name])),
};

type Key = keyof typeof messages.en;

const translations: Record<OpenBukLocale, Record<Key, string>> = messages;
const Context = createContext({
  locale: "en" as OpenBukLocale,
  setLocale: (_: OpenBukLocale) => {},
  t: (key: Key): string => messages.en[key],
});
export function LanguageProvider({ children }: { children: ReactNode }) {
  const [locale, setValue] = useState<OpenBukLocale>(() => {
    const saved = localStorage.getItem("openbuk:locale");
    const hint = new URLSearchParams(location.search).get("lang");
    return resolveCorelyLocale(hint, saved, navigator.language);
  });
  const setLocale = useCallback((value: OpenBukLocale) => {
    setValue(value);
    localStorage.setItem("openbuk:locale", value);
    const url = new URL(location.href);
    if (url.searchParams.has("lang")) {
      url.searchParams.set("lang", value);
      history.replaceState(history.state, "", url);
    }
  }, []);
  useEffect(() => {
    document.documentElement.lang = locale;
    document.title = `OpenBuk — ${translations[locale].tagline}`;
    document
      .querySelector('meta[name="description"]')
      ?.setAttribute("content", `${translations[locale].tagline} ${translations[locale].intro}`);
  }, [locale]);
  return (
    <Context.Provider value={{ locale, setLocale, t: (key) => translations[locale][key] }}>
      {children}
    </Context.Provider>
  );
}
export const useLanguage = () => useContext(Context);
export function LanguageSwitch() {
  const { locale, setLocale, t } = useLanguage();
  return (
    <select
      className="language-select"
      value={locale}
      onChange={(event) => {
        const selected = normalizeCorelyLocale(event.target.value);
        if (selected) {
          setLocale(selected);
        }
      }}
      aria-label={t("interfaceLanguage")}
    >
      {Object.entries(languageNames).map(([value, name]) => (
        <option key={value} value={value} lang={value}>
          {name}
        </option>
      ))}
    </select>
  );
}
