// Formatting utilities for Corely One ERP
import i18n from "../i18n";

function resolveLocale(locale?: string): string {
  if (locale) {
    return locale;
  }
  const configuredLocale = i18n.t("common.locale");
  if (typeof configuredLocale === "string" && configuredLocale.trim().length > 0) {
    return configuredLocale;
  }
  return i18n.language || "en-US";
}

export function formatMoney(
  amountCents: number,
  locale?: string,
  currency: string = "EUR"
): string {
  const resolvedLocale = resolveLocale(locale);
  const amount = amountCents / 100;
  return new Intl.NumberFormat(resolvedLocale, {
    style: "currency",
    currency,
  }).format(amount);
}

export function formatDate(isoDate: string, locale?: string): string {
  const resolvedLocale = resolveLocale(locale);
  const date = new Date(isoDate);
  return new Intl.DateTimeFormat(resolvedLocale, {
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(date);
}

export function formatDateLong(isoDate: string, locale?: string): string {
  const resolvedLocale = resolveLocale(locale);
  const date = new Date(isoDate);
  return new Intl.DateTimeFormat(resolvedLocale, {
    year: "numeric",
    month: "long",
    day: "numeric",
  }).format(date);
}

export function formatDateShort(isoDate: string, locale?: string): string {
  const resolvedLocale = resolveLocale(locale);
  const date = new Date(isoDate);
  return new Intl.DateTimeFormat(resolvedLocale, {
    month: "2-digit",
    day: "2-digit",
    year: "2-digit",
  }).format(date);
}

export function formatDateTime(isoDate: string, locale?: string): string {
  const resolvedLocale = resolveLocale(locale);
  const date = new Date(isoDate);
  return new Intl.DateTimeFormat(resolvedLocale, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

export function formatRelativeTime(isoDate: string, locale?: string): string {
  const resolvedLocale = resolveLocale(locale);
  const date = new Date(isoDate);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) {
    return i18n.t("time.today");
  }
  if (diffDays === 1) {
    return i18n.t("time.yesterday");
  }
  if (diffDays > 0 && diffDays < 7) {
    return i18n.t("time.daysAgo", { count: diffDays });
  }
  if (diffDays < 0) {
    const futureDays = Math.abs(diffDays);
    if (futureDays === 1) {
      return i18n.t("time.tomorrow");
    }
    if (futureDays < 7) {
      return i18n.t("time.inDays", { count: futureDays });
    }
  }

  return formatDate(isoDate, resolvedLocale);
}

/**
 * Format a due date showing days until/overdue
 * For future dates: "in X Tagen" / "in X days"
 * For past dates: "X Tage überfällig" / "X days overdue"
 */
export function formatDueDate(isoDate: string, locale?: string): string {
  const date = new Date(isoDate);
  const now = new Date();
  const diffMs = date.getTime() - now.getTime(); // Future dates are positive
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) {
    return i18n.t("dueDate.today");
  }

  if (diffDays > 0) {
    // Future date
    return i18n.t("dueDate.inDays", { count: diffDays });
  } else {
    // Past date (overdue)
    const overdueDays = Math.abs(diffDays);
    return i18n.t("dueDate.overdue", { count: overdueDays });
  }
}

export function formatVatRate(rate: number): string {
  return `${rate}%`;
}

export function formatPercentage(value: number, locale?: string): string {
  const resolvedLocale = resolveLocale(locale);
  return new Intl.NumberFormat(resolvedLocale, {
    style: "percent",
    minimumFractionDigits: 0,
    maximumFractionDigits: 1,
  }).format(value / 100);
}

export function generateInvoiceNumber(prefix: string, year: number, sequence: number): string {
  const paddedSequence = sequence.toString().padStart(4, "0");
  return `${prefix}-${year}-${paddedSequence}`;
}

export function calculateVat(netAmountCents: number, vatRate: number): number {
  return Math.round(netAmountCents * (vatRate / 100));
}

export function calculateNetFromGross(grossAmountCents: number, vatRate: number): number {
  return Math.round(grossAmountCents / (1 + vatRate / 100));
}

export function calculateGrossFromNet(netAmountCents: number, vatRate: number): number {
  return Math.round(netAmountCents * (1 + vatRate / 100));
}
