import { addDays } from "date-fns";
import { formatInTimeZone, fromZonedTime } from "date-fns-tz";

export type ReminderScheduleInput = {
  tenantTimeZone: string;
  baseInstant: Date;
  intervalDays: number;
  sendOnlyOnWeekdays: boolean;
};

const toLocalDate = (instant: Date, tz: string): string =>
  formatInTimeZone(instant, tz, "yyyy-MM-dd");

const addDaysToLocalDate = (localDate: string, days: number, tz: string): string => {
  const baseUtc = fromZonedTime(`${localDate}T00:00:00`, tz);
  return toLocalDate(addDays(baseUtc, days), tz);
};

const adjustToWeekday = (localDate: string, tz: string): string => {
  let nextDate = localDate;
  for (let i = 0; i < 7; i += 1) {
    const dateUtc = fromZonedTime(`${nextDate}T00:00:00`, tz);
    const day = Number(formatInTimeZone(dateUtc, tz, "i")); // 1=Mon..7=Sun
    if (day !== 6 && day !== 7) {
      return nextDate;
    }
    nextDate = addDaysToLocalDate(nextDate, 1, tz);
  }
  return nextDate;
};

export const computeNextReminderAt = async (input: ReminderScheduleInput): Promise<Date> => {
  const baseLocalDate = toLocalDate(input.baseInstant, input.tenantTimeZone);
  let nextLocalDate = addDaysToLocalDate(
    baseLocalDate,
    Math.max(0, input.intervalDays),
    input.tenantTimeZone
  );
  if (input.sendOnlyOnWeekdays) {
    nextLocalDate = adjustToWeekday(nextLocalDate, input.tenantTimeZone);
  }
  return fromZonedTime(`${nextLocalDate}T00:00:00`, input.tenantTimeZone);
};
