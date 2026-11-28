import { resolveCorelyLocale, type CorelyLocale } from "@corely/contracts";

export function loadBrowserLocale(storageKey: string): CorelyLocale {
  let saved: string | null = null;
  try {
    saved = localStorage.getItem(storageKey);
  } catch {
    // The browser language is still available.
  }
  return resolveCorelyLocale(
    new URLSearchParams(location.search).get("lang"),
    saved,
    navigator.language
  );
}

export function saveBrowserLocale(locale: CorelyLocale, storageKey: string) {
  document.documentElement.lang = locale;
  const url = new URL(location.href);
  if (url.searchParams.has("lang")) {
    url.searchParams.set("lang", locale);
    history.replaceState(history.state, "", url);
  }
  try {
    localStorage.setItem(storageKey, locale);
  } catch {
    // The selected language stays active for the current page.
  }
}
