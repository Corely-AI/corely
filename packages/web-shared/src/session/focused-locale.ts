import { resolveCorelyLocale, type CorelyLocale } from "@corely/contracts";
import { loadBrowserLocale, saveBrowserLocale } from "../shared/i18n/browser-language-preference";

const preferenceKey = "Corely One ERP-language";

export type FocusedLocale = CorelyLocale;

export function loadFocusedLocale() {
  return loadBrowserLocale(preferenceKey);
}

export function persistFocusedLocale(locale: FocusedLocale) {
  saveBrowserLocale(locale, preferenceKey);
}
export function resolveFocusedLocale(
  saved: string | null | undefined,
  browserLanguage: string,
  hint?: string | null
): FocusedLocale {
  return resolveCorelyLocale(hint, saved, browserLanguage);
}
