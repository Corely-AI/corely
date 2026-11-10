export type FocusedLocale = "en" | "de" | "vi";
export function persistFocusedLocale(locale: FocusedLocale) {
  document.documentElement.lang = locale;
  try {
    localStorage.setItem("Corely One ERP-language", locale);
  } catch {
    /* Keep the current language in memory. */
  }
  const url = new URL(window.location.href);
  if (url.searchParams.has("lang")) {
    url.searchParams.set("lang", locale);
    window.history.replaceState(window.history.state, "", url.href);
  }
}
export function resolveFocusedLocale(
  saved: string | null | undefined,
  browserLanguage: string,
  hint?: string | null
): FocusedLocale {
  if (hint === "en" || hint === "de" || hint === "vi") {
    return hint;
  }
  const language = (saved || browserLanguage).toLowerCase().split("-")[0];
  return language === "de" || language === "vi" ? language : "en";
}
