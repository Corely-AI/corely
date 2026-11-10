export type FocusedLocale = "en" | "de" | "vi";
export function resolveFocusedLocale(
  saved: string | null | undefined,
  browserLanguage: string
): FocusedLocale {
  const language = (saved || browserLanguage).toLowerCase().split("-")[0];
  return language === "de" || language === "vi" ? language : "en";
}
