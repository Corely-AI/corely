/**
 * Default currency codes (top 10 + VND)
 */
export const DEFAULT_CURRENCY_CODES = [
  "USD",
  "EUR",
  "JPY",
  "GBP",
  "AUD",
  "CAD",
  "CHF",
  "CNY",
  "HKD",
  "NZD",
  "VND",
] as const;

/**
 * Normalizes a currency code to uppercase
 */
export function normalizeCurrencyCode(input: string): string {
  return input.trim().toUpperCase();
}

/**
 * Validates a currency code (3 uppercase letters)
 */
export function isValidCurrencyCode(input: string): boolean {
  const normalized = normalizeCurrencyCode(input);
  return /^[A-Z]{3}$/.test(normalized);
}

/**
 * Sorts currency codes alphabetically (unique, uppercase)
 */
export function sortCurrencyCodes(codes: readonly string[]): string[] {
  const normalized = codes.map(normalizeCurrencyCode);
  const unique = Array.from(new Set(normalized));
  return unique.sort();
}

/**
 * Derives a currency symbol for display using Intl APIs
 * Returns the currency code as fallback if Intl fails
 */
export function getCurrencySymbol(code: string, locale: string = "en-US"): string {
  try {
    const parts = new Intl.NumberFormat(locale, {
      style: "currency",
      currency: code.toUpperCase(),
      currencyDisplay: "narrowSymbol",
    }).formatToParts(0);

    const symbolPart = parts.find((p) => p.type === "currency");
    return symbolPart?.value ?? code;
  } catch {
    return code;
  }
}
