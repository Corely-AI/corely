export const corelyLocales = [
  "en",
  "de",
  "vi",
  "tr",
  "pl",
  "ru",
  "pt-PT",
  "it",
  "fr",
  "es",
] as const;

export type CorelyLocale = (typeof corelyLocales)[number];

export const corelyLocaleDetails = {
  en: { name: "English", label: "Language", format: "en-US" },
  de: { name: "Deutsch", label: "Sprache", format: "de-DE" },
  vi: { name: "Tiếng Việt", label: "Ngôn ngữ", format: "vi-VN" },
  tr: { name: "Türkçe", label: "Dil", format: "tr-TR" },
  pl: { name: "Polski", label: "Język", format: "pl-PL" },
  ru: { name: "Русский", label: "Язык", format: "ru-RU" },
  "pt-PT": { name: "Português (Portugal)", label: "Idioma", format: "pt-PT" },
  it: { name: "Italiano", label: "Lingua", format: "it-IT" },
  fr: { name: "Français", label: "Langue", format: "fr-FR" },
  es: { name: "Español", label: "Idioma", format: "es-ES" },
} as const satisfies Record<CorelyLocale, { name: string; label: string; format: string }>;

export function normalizeCorelyLocale(value: unknown): CorelyLocale | undefined {
  if (typeof value !== "string") {
    return undefined;
  }
  const language = value.trim().toLowerCase().split(/[-_]/)[0];
  return corelyLocales.find((locale) => locale.toLowerCase().split("-")[0] === language);
}

export function resolveCorelyLocale(...preferences: (string | null | undefined)[]): CorelyLocale {
  for (const preference of preferences) {
    const locale = normalizeCorelyLocale(preference);
    if (locale) {
      return locale;
    }
  }
  return "en";
}

export function negotiateCorelyLocale(acceptLanguage: string | null): CorelyLocale {
  const preferences = (acceptLanguage ?? "")
    .split(",")
    .map((entry) => {
      const [language, weight] = entry.trim().split(/;\s*q=/i);
      return { language, weight: weight === undefined ? 1 : Number(weight) };
    })
    .filter(({ weight }) => weight > 0 && weight <= 1)
    .sort((first, second) => second.weight - first.weight);
  return resolveCorelyLocale(...preferences.map(({ language }) => language));
}

export function localizedValue<T>(
  values: Partial<Record<CorelyLocale, T>>,
  locale: CorelyLocale,
  fallback: T
): T {
  return values[locale] ?? values.en ?? fallback;
}
