import { describe, expect, it } from "vitest";
import { StaffPatternSchema, type StaffAvailability, type StaffPattern } from "@corely/contracts";
import {
  staffAvailabilityWindows,
  staffCovers,
  staffDateStart,
} from "../domain/staff-availability";
const pattern = (overrides: Partial<StaffPattern> = {}): StaffPattern => ({
  timezone: "Europe/Berlin",
  effectiveFrom: "2026-01-01",
  effectiveUntil: null,
  weeklyHours: [{ dayOfWeek: 0, startTime: "01:00", endTime: "04:00" }],
  exceptions: [],
  ...overrides,
});
const schedule = (p = pattern()): StaffAvailability => ({
  version: 1,
  plans: [{ revision: 1, startsAt: "2025-12-31T23:00:00.000Z", endsAt: null, pattern: p }],
});
const windows = (s: StaffAvailability, date: string) =>
  staffAvailabilityWindows(s, new Date(`${date}T00:00:00Z`), new Date(`${date}T23:59:00Z`));
describe("Staff civil-time availability", () => {
  it("does not invent gap minutes and keeps both fold occurrences", () => {
    expect(windows(schedule(), "2026-03-29")).toEqual([
      { startAt: "2026-03-29T00:00:00.000Z", endAt: "2026-03-29T02:00:00.000Z" },
    ]);
    const fold = windows(
      schedule(pattern({ weeklyHours: [{ dayOfWeek: 0, startTime: "02:15", endTime: "02:45" }] })),
      "2026-10-25"
    );
    expect(fold).toEqual([
      { startAt: "2026-10-25T00:15:00.000Z", endAt: "2026-10-25T00:45:00.000Z" },
      { startAt: "2026-10-25T01:15:00.000Z", endAt: "2026-10-25T01:45:00.000Z" },
    ]);
    expect(
      staffCovers(schedule(), new Date("2026-10-25T00:30:00Z"), new Date("2026-10-25T02:30:00Z"))
    ).toBe(true);
  });
  it("supports overnight hours and lets a closed next-date exception suppress incoming spill", () => {
    const p = pattern({
      timezone: "UTC",
      weeklyHours: [{ dayOfWeek: 6, startTime: "22:00", endTime: "02:00" }],
    });
    expect(windows(schedule(p), "2026-11-08")).toEqual([
      { startAt: "2026-11-08T00:00:00.000Z", endAt: "2026-11-08T02:00:00.000Z" },
    ]);
    p.exceptions = [{ date: "2026-11-08", windows: [] }];
    expect(windows(schedule(p), "2026-11-08")).toEqual([]);
  });
  it("replaces weekly hours with an exception and carries its overnight range only onto an unoverridden day", () => {
    const p = pattern({
      timezone: "UTC",
      exceptions: [{ date: "2026-11-07", windows: [{ startTime: "23:00", endTime: "03:00" }] }],
    });
    expect(windows(schedule(p), "2026-11-08")).toEqual([
      { startAt: "2026-11-08T00:00:00.000Z", endAt: "2026-11-08T04:00:00.000Z" },
    ]);
    p.exceptions.push({ date: "2026-11-08", windows: [{ startTime: "10:00", endTime: "11:00" }] });
    expect(windows(schedule(p), "2026-11-08")).toEqual([
      { startAt: "2026-11-08T10:00:00.000Z", endAt: "2026-11-08T11:00:00.000Z" },
    ]);
  });
  it("uses the latest effective plan, an exclusive end, and never revives an older plan", () => {
    const s = schedule(pattern({ timezone: "UTC" }));
    s.plans.push({
      revision: 2,
      startsAt: "2026-11-08T02:00:00.000Z",
      endsAt: "2026-11-08T03:00:00.000Z",
      pattern: pattern({
        timezone: "UTC",
        weeklyHours: [{ dayOfWeek: 0, startTime: "02:30", endTime: "04:00" }],
      }),
    });
    expect(windows(s, "2026-11-08")).toEqual([
      { startAt: "2026-11-08T01:00:00.000Z", endAt: "2026-11-08T02:00:00.000Z" },
      { startAt: "2026-11-08T02:30:00.000Z", endAt: "2026-11-08T03:00:00.000Z" },
    ]);
    expect(windows({ version: 0, plans: [] }, "2026-11-08")).toEqual([]);
  });
  it("resolves civil start dates and rejects a skipped calendar date", () => {
    expect(staffDateStart("2026-03-29", "Europe/Berlin")).toBe("2026-03-28T23:00:00.000Z");
    expect(() => staffDateStart("2011-12-30", "Pacific/Apia")).toThrow("does not exist");
  });
  it.each([
    { timezone: "Invalid/Zone" },
    { effectiveUntil: "2026-01-01" },
    { weeklyHours: [{ dayOfWeek: 1, startTime: "09:00", endTime: "09:00" }] },
    {
      weeklyHours: [
        { dayOfWeek: 6, startTime: "22:00", endTime: "02:00" },
        { dayOfWeek: 0, startTime: "01:00", endTime: "03:00" },
      ],
    },
    {
      exceptions: [
        { date: "2026-02-01", windows: [] },
        { date: "2026-02-01", windows: [] },
      ],
    },
    { exceptions: [{ date: "2025-12-31", windows: [] }] },
    {
      exceptions: [
        {
          date: "2026-02-01",
          windows: [
            { startTime: "10:00", endTime: "12:00" },
            { startTime: "11:00", endTime: "13:00" },
          ],
        },
      ],
    },
  ])("rejects invalid or conflicting inputs %j", (override) => {
    expect(StaffPatternSchema.safeParse(pattern(override)).success).toBe(false);
  });
});
