import { addDays, compareLocalDate, parseLocalDate, type LocalDate } from "@corely/kernel";
import { formatInTimeZone, fromZonedTime } from "date-fns-tz";

type SchedulePattern = {
  version?: number;
  recurrence?: {
    frequency?: "DAILY" | "WEEKLY" | "MONTHLY" | "YEARLY";
    interval?: number;
    daysOfWeek?: string[];
    monthly?: {
      mode?: "DAY_OF_MONTH" | "WEEKDAY_OF_MONTH";
      day?: number;
      week?: number;
      weekday?: string;
    };
    yearly?: {
      month?: number;
      day?: number;
    };
  };
  startsOn?: string;
  time?: string;
  ends?: { type: "ON_DATE"; date: string } | { type: "AFTER"; count: number };
};

const WEEKDAYS: Array<{ code: string; iso: number }> = [
  { code: "MO", iso: 1 },
  { code: "TU", iso: 2 },
  { code: "WE", iso: 3 },
  { code: "TH", iso: 4 },
  { code: "FR", iso: 5 },
  { code: "SA", iso: 6 },
  { code: "SU", iso: 7 },
];

const parsePattern = (
  value: Record<string, unknown> | null | undefined
): SchedulePattern | null => {
  if (!value || typeof value !== "object") {
    return null;
  }
  return value as SchedulePattern;
};

const parseTime = (value?: string): string | null => {
  if (!value) {
    return null;
  }
  if (!/^\d{2}:\d{2}$/.test(value)) {
    return null;
  }
  return value;
};

const getMonthRangeLocal = (month: string): { start: LocalDate; end: LocalDate } => {
  const [yearStr, monthStr] = month.split("-");
  const year = Number(yearStr);
  const monthIndex = Number(monthStr) - 1;
  const daysInMonth = new Date(year, monthIndex + 1, 0).getDate();
  const start = parseLocalDate(`${month}-01`);
  const end = parseLocalDate(`${month}-${String(daysInMonth).padStart(2, "0")}`);
  return { start, end };
};

const diffDays = (start: LocalDate, end: LocalDate, tz: string) => {
  const startUtc = fromZonedTime(`${start}T00:00:00`, tz);
  const endUtc = fromZonedTime(`${end}T00:00:00`, tz);
  return Math.floor((endUtc.getTime() - startUtc.getTime()) / 86_400_000);
};

const diffMonths = (start: LocalDate, end: LocalDate) => {
  const [sYear, sMonth] = start.split("-").map((v) => Number(v));
  const [eYear, eMonth] = end.split("-").map((v) => Number(v));
  return (eYear - sYear) * 12 + (eMonth - sMonth);
};

const weekdayCode = (localDate: LocalDate, tz: string) => {
  const atNoon = fromZonedTime(`${localDate}T12:00:00`, tz);
  const isoDay = Number(formatInTimeZone(atNoon, tz, "i"));
  return WEEKDAYS.find((item) => item.iso === isoDay)?.code ?? "MO";
};

const isLastWeekdayOfMonth = (localDate: LocalDate, tz: string) => {
  const nextWeek = addDays(localDate, 7, tz as any);
  return localDate.slice(0, 7) !== nextWeek.slice(0, 7);
};

const matchesMonthlyRule = (
  localDate: LocalDate,
  monthly: NonNullable<SchedulePattern["recurrence"]>["monthly"],
  tz: string
) => {
  if (!monthly) {
    return false;
  }
  const dayOfMonth = Number(localDate.slice(8, 10));
  if (monthly.mode === "DAY_OF_MONTH" && typeof monthly.day === "number") {
    return dayOfMonth === monthly.day;
  }
  if (
    monthly.mode === "WEEKDAY_OF_MONTH" &&
    typeof monthly.week === "number" &&
    typeof monthly.weekday === "string"
  ) {
    const code = weekdayCode(localDate, tz);
    if (code !== monthly.weekday) {
      return false;
    }
    if (monthly.week === -1) {
      return isLastWeekdayOfMonth(localDate, tz);
    }
    const weekIndex = Math.floor((dayOfMonth - 1) / 7) + 1;
    return weekIndex === monthly.week;
  }
  return false;
};

const matchesRecurrence = (
  pattern: SchedulePattern,
  start: LocalDate,
  current: LocalDate,
  tz: string
) => {
  const recurrence = pattern.recurrence;
  if (!recurrence || !recurrence.frequency) {
    return false;
  }
  const interval = Math.max(1, Math.floor(recurrence.interval ?? 1));
  const dayDiff = diffDays(start, current, tz);
  if (dayDiff < 0) {
    return false;
  }

  switch (recurrence.frequency) {
    case "DAILY":
      return dayDiff % interval === 0;
    case "WEEKLY": {
      const weekIndex = Math.floor(dayDiff / 7);
      const daysOfWeek = recurrence.daysOfWeek ?? [];
      if (weekIndex % interval !== 0) {
        return false;
      }
      return daysOfWeek.includes(weekdayCode(current, tz));
    }
    case "MONTHLY": {
      const monthDiff = diffMonths(start, current);
      if (monthDiff < 0 || monthDiff % interval !== 0) {
        return false;
      }
      return matchesMonthlyRule(current, recurrence.monthly, tz);
    }
    case "YEARLY": {
      const [startYear] = start.split("-").map((v) => Number(v));
      const [currentYear] = current.split("-").map((v) => Number(v));
      const yearDiff = currentYear - startYear;
      if (yearDiff < 0 || yearDiff % interval !== 0) {
        return false;
      }
      if (!recurrence.yearly) {
        return false;
      }
      const [, currentMonth, currentDay] = current.split("-").map((v) => Number(v));
      return recurrence.yearly.month === currentMonth && recurrence.yearly.day === currentDay;
    }
    default:
      return false;
  }
};

export const generateScheduledSessionStartsForMonth = (params: {
  schedulePattern: Record<string, unknown> | null | undefined;
  month: string;
  timezone: string;
}): Date[] => {
  const pattern = parsePattern(params.schedulePattern);
  if (!pattern?.recurrence) {
    return [];
  }

  const time = parseTime(pattern.time);
  if (!time) {
    return [];
  }

  const { start: monthStart, end: monthEnd } = getMonthRangeLocal(params.month);
  const startDate = pattern.startsOn ? parseLocalDate(pattern.startsOn) : monthStart;

  const ends = pattern.ends;
  const endLimit = ends?.type === "ON_DATE" && ends.date ? parseLocalDate(ends.date) : monthEnd;

  const dates: Date[] = [];
  let occurrenceCount = 0;
  let cursor = startDate;

  while (compareLocalDate(cursor, monthEnd) <= 0) {
    if (ends?.type === "ON_DATE" && compareLocalDate(cursor, endLimit) > 0) {
      break;
    }

    if (matchesRecurrence(pattern, startDate, cursor, params.timezone)) {
      occurrenceCount += 1;
      if (ends?.type === "AFTER" && occurrenceCount > ends.count) {
        break;
      }

      if (compareLocalDate(cursor, monthStart) >= 0 && compareLocalDate(cursor, monthEnd) <= 0) {
        const startsAt = fromZonedTime(`${cursor}T${time}:00`, params.timezone);
        dates.push(startsAt);
      }
    }

    cursor = addDays(cursor, 1, params.timezone as any);
  }

  return dates;
};
