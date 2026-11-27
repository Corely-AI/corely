import type { CorelyLocale, PublicBookingService } from "@corely/contracts";

export const toDateKey = (date: Date): string => {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");
  return `${year}-${month}-${day}`;
};

export const toUtcIsoStartOfDay = (date: Date): string =>
  new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate())).toISOString();

export const addDays = (date: Date, days: number): Date => {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
};

export const getBrowserTimezone = (): string | null => {
  try {
    const timezone = new Intl.DateTimeFormat().resolvedOptions().timeZone;
    if (!timezone) {
      return null;
    }

    new Intl.DateTimeFormat("en-US", { timeZone: timezone }).format(new Date());
    return timezone;
  } catch {
    return null;
  }
};

export const formatSlotTime = (iso: string, timezone: string, locale: CorelyLocale): string => {
  const date = new Date(iso);

  try {
    return new Intl.DateTimeFormat(locale, {
      hour: "numeric",
      minute: "2-digit",
      timeZone: timezone,
    }).format(date);
  } catch {
    return new Intl.DateTimeFormat(locale, {
      hour: "numeric",
      minute: "2-digit",
    }).format(date);
  }
};

export const formatSlotDate = (iso: string, timezone: string, locale: CorelyLocale): string => {
  const date = new Date(iso);

  try {
    return new Intl.DateTimeFormat(locale, {
      weekday: "short",
      month: "short",
      day: "numeric",
      timeZone: timezone,
    }).format(date);
  } catch {
    return new Intl.DateTimeFormat(locale, {
      weekday: "short",
      month: "short",
      day: "numeric",
    }).format(date);
  }
};

export const formatDuration = (minutes: number): string => {
  if (minutes < 60) {
    return `${minutes} min`;
  }
  const hours = Math.floor(minutes / 60);
  const rem = minutes % 60;
  if (rem === 0) {
    return `${hours}h`;
  }
  return `${hours}h ${rem}m`;
};

export const formatPrice = (
  service: PublicBookingService,
  locale: CorelyLocale,
  priceOnRequest: string
): string => {
  if (!service.priceCents || !service.currency) {
    return priceOnRequest;
  }
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency: service.currency,
  }).format(service.priceCents / 100);
};

export const groupServices = (services: PublicBookingService[], defaultCategory: string) => {
  const map = new Map<string, PublicBookingService[]>();
  for (const service of services) {
    const category = service.category?.trim() || defaultCategory;
    const group = map.get(category) ?? [];
    group.push(service);
    map.set(category, group);
  }
  return Array.from(map.entries());
};

export const formatBookingDateTime = (iso: string, locale: CorelyLocale): string =>
  new Intl.DateTimeFormat(locale, {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(iso));
