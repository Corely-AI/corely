const DOCS_ROOT_URL = "https://docs.corely.one/";

function normalizeLocale(locale?: string | null): string {
  if (locale && locale.trim().length > 0) {
    return locale.toLowerCase().split("-")[0];
  }

  if (typeof navigator !== "undefined" && navigator.language) {
    return navigator.language.toLowerCase().split("-")[0];
  }

  return "en";
}

export function getDocsBaseUrl(locale?: string | null): string {
  const normalizedLocale = normalizeLocale(locale);

  if (normalizedLocale === "de") {
    return `${DOCS_ROOT_URL}de/`;
  }

  if (normalizedLocale === "vi") {
    return `${DOCS_ROOT_URL}vi/`;
  }

  return DOCS_ROOT_URL;
}
