import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import {
  corelyLocaleDetails,
  corelyLocales,
  resolveCorelyLocale,
  type CorelyLocale,
} from "@corely/contracts";
import { loadBrowserLocale, saveBrowserLocale } from "./browser-language-preference";

const BrowserLocaleContext = createContext<{
  locale: CorelyLocale;
  setLocale: (value: CorelyLocale) => void;
}>({
  locale: "en",
  setLocale: () => {},
});

export function BrowserLocaleProvider({
  storageKey,
  children,
}: {
  storageKey: string;
  children: ReactNode;
}) {
  const [locale, setLocale] = useState(() => loadBrowserLocale(storageKey));

  useEffect(() => {
    saveBrowserLocale(locale, storageKey);
  }, [locale, storageKey]);

  return (
    <BrowserLocaleContext.Provider value={{ locale, setLocale }}>
      {children}
    </BrowserLocaleContext.Provider>
  );
}

export function useBrowserLocale() {
  return useContext(BrowserLocaleContext).locale;
}

export function BrowserLanguageSelect({ className }: { className?: string }) {
  const { locale, setLocale } = useContext(BrowserLocaleContext);
  return (
    <select
      className={className}
      aria-label={corelyLocaleDetails[locale].label}
      value={locale}
      onChange={(event) => setLocale(resolveCorelyLocale(event.target.value))}
    >
      {corelyLocales.map((language) => (
        <option key={language} value={language} lang={language}>
          {corelyLocaleDetails[language].name}
        </option>
      ))}
    </select>
  );
}
