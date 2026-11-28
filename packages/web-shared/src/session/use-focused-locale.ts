import { useEffect, useState } from "react";
import { loadFocusedLocale, persistFocusedLocale } from "./focused-locale";

export function useFocusedLocale() {
  const [locale, setLocale] = useState(loadFocusedLocale);
  useEffect(() => {
    persistFocusedLocale(locale);
  }, [locale]);
  return [locale, setLocale] as const;
}
