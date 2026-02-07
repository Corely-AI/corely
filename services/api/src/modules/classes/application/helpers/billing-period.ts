import { formatInTimeZone, fromZonedTime } from "date-fns-tz";
import { ValidationFailedError } from "@corely/domain";

export const BILLING_TIMEZONE = "Europe/Berlin";

export const normalizeBillingMonth = (month: string) => {
  if (!/^\d{4}-\d{2}$/.test(month)) {
    throw new ValidationFailedError("Invalid billing month", [
      { message: "Expected YYYY-MM", members: ["month"] },
    ]);
  }
  return month;
};

export const getMonthRangeUtc = (month: string, tz: string = BILLING_TIMEZONE) => {
  const normalized = normalizeBillingMonth(month);
  const startLocal = `${normalized}-01T00:00:00`;
  const startUtc = fromZonedTime(startLocal, tz);

  const [yearStr, monthStr] = normalized.split("-");
  const year = Number(yearStr);
  const monthIndex = Number(monthStr) - 1;
  const nextMonth =
    monthIndex === 11 ? { year: year + 1, month: 0 } : { year, month: monthIndex + 1 };
  const nextMonthLocal = `${String(nextMonth.year).padStart(4, "0")}-${String(
    nextMonth.month + 1
  ).padStart(2, "0")}-01T00:00:00`;
  const nextStartUtc = fromZonedTime(nextMonthLocal, tz);
  const endUtc = new Date(nextStartUtc.getTime() - 1);

  return { startUtc, endUtc, month: normalized };
};

export const getMonthKeyForInstant = (instant: Date, tz: string = BILLING_TIMEZONE) => {
  return formatInTimeZone(instant, tz, "yyyy-MM");
};
