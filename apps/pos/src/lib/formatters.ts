import { getI18nLanguage, getLanguageLocaleTag } from "@/lib/i18n";

function resolveLocaleTag(): string {
  return getLanguageLocaleTag(getI18nLanguage());
}

export function formatCurrencyFromCents(
  valueCents: number,
  options?: { currency?: string }
): string {
  const formatter = new Intl.NumberFormat(resolveLocaleTag(), {
    style: "currency",
    currency: options?.currency ?? "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  return formatter.format(valueCents / 100);
}

export function formatDateTime(value: Date | string | number): string {
  const date = value instanceof Date ? value : new Date(value);
  return new Intl.DateTimeFormat(resolveLocaleTag(), {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

export function formatTime(value: Date | string | number): string {
  const date = value instanceof Date ? value : new Date(value);
  return new Intl.DateTimeFormat(resolveLocaleTag(), {
    timeStyle: "short",
  }).format(date);
}
