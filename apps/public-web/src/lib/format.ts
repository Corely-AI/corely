export const formatDate = (value: string | null | undefined): string => {
  if (!value) {
    return "";
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(date);
};

export const estimateReadTime = (text: string): string => {
  const words = text.trim().split(/\s+/).filter(Boolean).length;
  const minutes = Math.max(1, Math.ceil(words / 200));
  return `${minutes} min read`;
};

export const formatMoney = (
  amount: number,
  currency: string,
  options?: {
    locale?: string;
    maximumFractionDigits?: number;
  }
): string =>
  new Intl.NumberFormat(options?.locale ?? "en-US", {
    style: "currency",
    currency,
    maximumFractionDigits: options?.maximumFractionDigits ?? 2,
  }).format(amount);
