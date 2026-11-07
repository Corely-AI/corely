import type { OpenBukSlot, OpenBukStudio } from "@corely/contracts";

export type OccupiedInterval = { startAt: Date; endAt: Date };
const MINUTE = 60_000;

export function studioDate(instant: Date, timezone: string): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(instant);
  const value = (type: Intl.DateTimeFormatPartTypes) => parts.find((p) => p.type === type)?.value;
  return `${value("year")}-${value("month")}-${value("day")}`;
}

/** Walk real instants, then evaluate local wall time. DST gaps have no instants;
 * repeated wall times retain separate offsets. Intervals are half-open. */
export function openBukAvailability(
  studio: OpenBukStudio,
  day: string,
  now: Date,
  occupied: OccupiedInterval[],
  staffWindows?: { startAt: string; endAt: string }[] | null
): OpenBukSlot[] {
  const midnight = Date.parse(`${day}T00:00:00Z`);
  if (!Number.isFinite(midnight)) {
    return [];
  }
  const weekday = new Date(midnight).getUTCDay();
  const windows = studio.weeklyHours
    .filter((h) => h.dayOfWeek === weekday)
    .map((h) => ({
      from: Number(h.startTime.slice(0, 2)) * 60 + Number(h.startTime.slice(3)),
      to: Number(h.endTime.slice(0, 2)) * 60 + Number(h.endTime.slice(3)),
    }));
  if (!windows.length) {
    return [];
  }
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: studio.timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  });
  const first = midnight - 14 * 60 * MINUTE;
  const count = 52 * 60;
  const closedPrefix = [0];
  const candidates: number[] = [];
  for (let i = 0; i < count; i++) {
    const parts = formatter.formatToParts(new Date(first + i * MINUTE));
    const value = (type: Intl.DateTimeFormatPartTypes) =>
      parts.find((p) => p.type === type)?.value ?? "";
    const date = `${value("year")}-${value("month")}-${value("day")}`;
    const minute = Number(value("hour")) * 60 + Number(value("minute"));
    const open = date === day && windows.some((w) => minute >= w.from && minute < w.to);
    closedPrefix.push(closedPrefix[i] + (open ? 0 : 1));
    if (open && minute % 15 === 0) {
      candidates.push(i);
    }
  }
  const blocked = [
    ...occupied,
    ...studio.blockedTimes.map((b) => ({
      startAt: new Date(b.startAt),
      endAt: new Date(b.endAt),
    })),
  ];
  return candidates.flatMap((i) => {
    const start = first + i * MINUTE;
    const end = start + studio.durationMinutes * MINUTE;
    const before = i - studio.bufferBeforeMinutes;
    const after = i + studio.durationMinutes + studio.bufferAfterMinutes;
    if (before < 0 || after > count || closedPrefix[after] !== closedPrefix[before]) {
      return [];
    }
    if (
      start < now.getTime() + studio.minimumNoticeMinutes * MINUTE ||
      start > now.getTime() + studio.maximumAdvanceDays * 24 * 60 * MINUTE
    ) {
      return [];
    }
    const busyStart = first + before * MINUTE;
    const busyEnd = first + after * MINUTE;
    if (
      (studio.effectiveFrom && busyStart < Date.parse(studio.effectiveFrom)) ||
      (studio.effectiveTo && busyEnd > Date.parse(studio.effectiveTo))
    ) {
      return [];
    }
    if (
      staffWindows &&
      !staffWindows.some(
        (w) => Date.parse(w.startAt) <= busyStart && Date.parse(w.endAt) >= busyEnd
      )
    ) {
      return [];
    }
    if (blocked.some((b) => b.startAt.getTime() < busyEnd && b.endAt.getTime() > busyStart)) {
      return [];
    }
    return [{ startAt: new Date(start).toISOString(), endAt: new Date(end).toISOString() }];
  });
}
