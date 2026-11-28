import { corelyLocaleDetails, corelyLocales, resolveCorelyLocale } from "@corely/contracts";
import { useTranslation } from "react-i18next";
import { setPortalLanguage } from "./i18n";

export function PortalLanguagePicker() {
  const { i18n } = useTranslation();
  const locale = resolveCorelyLocale(i18n.language);

  return (
    <select
      aria-label={corelyLocaleDetails[locale].label}
      className="max-w-48 rounded-lg bg-slate-900 px-2 py-2 text-sm text-slate-100"
      value={locale}
      onChange={(event) => setPortalLanguage(resolveCorelyLocale(event.target.value))}
    >
      {corelyLocales.map((language) => (
        <option key={language} value={language} lang={language}>
          {corelyLocaleDetails[language].name}
        </option>
      ))}
    </select>
  );
}
