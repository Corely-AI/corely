import { useEffect, useState } from "react";
import { persistFocusedLocale, resolveFocusedLocale, type FocusedLocale } from "./focused-locale";

export function useFocusedLocale() {
  const [locale, setLocale] = useState<FocusedLocale>(() => {
    let saved: string | null = null;
    try {
      saved = localStorage.getItem("Corely One ERP-language");
    } catch {
      /* Browser language is available. */
    }
    return resolveFocusedLocale(
      saved,
      navigator.language,
      new URLSearchParams(location.search).get("lang")
    );
  });
  useEffect(() => {
    persistFocusedLocale(locale);
  }, [locale]);
  return [locale, setLocale] as const;
}
