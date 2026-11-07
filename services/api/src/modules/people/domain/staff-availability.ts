import type { StaffAvailability, StaffPattern } from "@corely/contracts";

export type AvailabilityWindow = { startAt: string; endAt: string };
const minute = 60000;
const day = 86400000;
const minutes = (s: string) => Number(s.slice(0, 2)) * 60 + Number(s.slice(3));
const formatters = new Map<string, Intl.DateTimeFormat>();
function local(instant: number, timezone: string) {
  let formatter = formatters.get(timezone);
  if (!formatter) {
    formatter = new Intl.DateTimeFormat("en-CA", {
      timeZone: timezone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hourCycle: "h23",
    });
    formatters.set(timezone, formatter);
  }
  const p = Object.fromEntries(formatter.formatToParts(instant).map((p) => [p.type, p.value]));
  return { date: `${p.year}-${p.month}-${p.day}`, minutes: Number(p.hour) * 60 + Number(p.minute) };
}
export function staffLocalDate(instant: Date, timezone: string) {
  return local(instant.getTime(), timezone).date;
}
// First real instant on a civil date. Midnight gaps/folds and skipped dates are explicit.
export function staffDateStart(date: string, timezone: string): string {
  const utc = Date.parse(`${date}T00:00:00Z`);
  for (let t = utc - 14 * 3600000; t < utc + 38 * 3600000; t += minute) {
    if (local(t, timezone).date === date) {
      return new Date(t).toISOString();
    }
  }
  throw new Error("The effective date does not exist in this timezone");
}
function open(pattern: StaffPattern, instant: number) {
  const current = local(instant, pattern.timezone);
  const dateUtc = Date.parse(`${current.date}T00:00:00Z`);
  const weekday = new Date(dateUtc).getUTCDay();
  const exception = pattern.exceptions.find((e) => e.date === current.date);
  const contains = (windows: StaffPattern["exceptions"][number]["windows"], carry: boolean) =>
    windows.some((w) => {
      const start = minutes(w.startTime),
        end = minutes(w.endTime);
      return carry
        ? end < start && current.minutes < end
        : current.minutes >= start && (end < start || current.minutes < end);
    });
  // A date's exception replaces its entire day, including incoming overnight spill.
  if (exception) {
    return contains(exception.windows, false);
  }
  const previous = new Date(dateUtc - day).toISOString().slice(0, 10);
  const priorException = pattern.exceptions.find((e) => e.date === previous);
  return (
    contains(
      pattern.weeklyHours.filter((w) => w.dayOfWeek === weekday),
      false
    ) ||
    contains(
      priorException?.windows ??
        pattern.weeklyHours.filter((w) => w.dayOfWeek === (weekday + 6) % 7),
      true
    )
  );
}
export function staffAvailabilityWindows(
  schedule: StaffAvailability,
  from: Date,
  to: Date
): AvailabilityWindow[] {
  if (!(from < to) || to.getTime() - from.getTime() > 62 * day) {
    throw new Error("Availability range must be 1–62 days");
  }
  const plans = [...schedule.plans].sort((a, b) => b.startsAt.localeCompare(a.startsAt));
  const windows: AvailabilityWindow[] = [];
  // Walk actual instants: gaps produce no invented minutes; folds include both occurrences.
  for (let t = Math.floor(from.getTime() / minute) * minute; t < to.getTime(); t += minute) {
    const plan = plans.find((p) => Date.parse(p.startsAt) <= t);
    if (!plan || (plan.endsAt && t >= Date.parse(plan.endsAt)) || !open(plan.pattern, t)) {
      continue;
    }
    const start = Math.max(t, from.getTime(), Date.parse(plan.startsAt));
    const end = Math.min(
      t + minute,
      to.getTime(),
      plan.endsAt ? Date.parse(plan.endsAt) : Infinity
    );
    const last = windows.at(-1);
    if (last && Date.parse(last.endAt) === start) {
      last.endAt = new Date(end).toISOString();
    } else {
      windows.push({ startAt: new Date(start).toISOString(), endAt: new Date(end).toISOString() });
    }
  }
  return windows;
}
export function staffCovers(schedule: StaffAvailability, from: Date, to: Date) {
  if (!(from < to) || to.getTime() - from.getTime() > 62 * day) {
    return false;
  }
  return staffAvailabilityWindows(schedule, from, to).some(
    (w) => Date.parse(w.startAt) <= from.getTime() && Date.parse(w.endAt) >= to.getTime()
  );
}
