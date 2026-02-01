/**
 * Canonical currency identifier: ISO 4217 code, uppercase, 3 letters.
 */
export type CurrencyCode = string;

/**
 * Normalizes a string to a canonical CurrencyCode (uppercase, 3 chars).
 * This is a low-level helper for the kernel and domain.
 */
export function normalizeCurrencyCode(code: string): CurrencyCode {
  const normalized = code.trim().toUpperCase();
  if (!/^[A-Z]{3}$/.test(normalized)) {
    throw new Error(`Invalid currency code: ${code}. Must be 3-letter ISO code.`);
  }
  return normalized;
}

/**
 * Derives the currency symbol for presentation using Intl APIs.
 * This should be used at render-time only.
 */
export function getCurrencySymbol(currency: string, locale: string = "en-US"): string {
  try {
    const parts = new Intl.NumberFormat(locale, {
      style: "currency",
      currency,
    }).formatToParts(0);
    const symbolPart = parts.find((p) => p.type === "currency");
    return symbolPart ? symbolPart.value : currency;
  } catch (e) {
    return currency;
  }
}

/**
 * Formats an amount with currency symbol using Intl APIs.
 * Defaults to decimal units (e.g., 1.50).
 */
export function formatMoney(amount: number, currency: string, locale: string = "en-US"): string {
  try {
    return new Intl.NumberFormat(locale, {
      style: "currency",
      currency,
    }).format(amount);
  } catch (e) {
    return `${currency} ${amount.toFixed(2)}`;
  }
}
