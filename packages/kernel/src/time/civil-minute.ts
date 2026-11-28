import { ValidationError } from "../application/errors";
import { parseLocalDate } from "./local-date";
import { assertTimeZoneId } from "./time-zone";

const minute = 60_000;
const hour = 60 * minute;
const formatters = new Map<string, Intl.DateTimeFormat>();
function civil(instant: number, timezone: string) {
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
  return { date: `${p.year}-${p.month}-${p.day}`, time: `${p.hour}:${p.minute}` };
}
export function civilDateAt(instant: Date, timezone: string): string {
  assertTimeZoneId(timezone);
  return civil(instant.getTime(), timezone).date;
}
export function addCivilDays(date: string, days: number): string {
  parseLocalDate(date);
  return new Date(Date.parse(`${date}T12:00:00Z`) + days * 86400000).toISOString().slice(0, 10);
}
// Resolve every plausible offset around the civil minute. Gaps have no candidate;
// folds choose the earliest actual instant rather than generating two occurrences.
export function resolveCivilMinute(date: string, time: string, timezone: string): Date | null {
  parseLocalDate(date);
  assertTimeZoneId(timezone);
  if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(time)) {
    throw new ValidationError("Invalid local minute");
  }
  const nominal = Date.parse(`${date}T${time}:00Z`);
  const offsets = new Set<number>();
  for (let hours = -36; hours <= 36; hours += 6) {
    const sampled = nominal + hours * hour;
    const local = civil(sampled, timezone);
    offsets.add(Date.parse(`${local.date}T${local.time}:00Z`) - sampled);
  }
  const candidates = [...offsets]
    .map((offset) => nominal - offset)
    .filter((instant) => {
      const local = civil(instant, timezone);
      return local.date === date && local.time === time;
    });
  return candidates.length ? new Date(Math.min(...candidates)) : null;
}
// Walking actual minutes also handles midnight transitions and completely skipped
// civil dates. Callers can cache a day's neutral window for a bounded generation run.
export function civilDayWindow(date: string, timezone: string): { from: Date; to: Date } | null {
  parseLocalDate(date);
  assertTimeZoneId(timezone);
  const nominal = Date.parse(`${date}T00:00:00Z`);
  let first: number | null = null,
    last: number | null = null;
  for (let instant = nominal - 24 * hour; instant < nominal + 48 * hour; instant += minute) {
    if (civil(instant, timezone).date === date) {
      first ??= instant;
      last = instant;
    }
  }
  return first !== null && last !== null
    ? { from: new Date(first), to: new Date(last + minute) }
    : null;
}
