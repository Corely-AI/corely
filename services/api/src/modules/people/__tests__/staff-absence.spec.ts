import { describe, it, expect } from "vitest";
import { RecordStaffAbsenceSchema, type StaffAbsence } from "@corely/contracts";
import { absenceInterval, absenceBlocks, subtractAbsences } from "../domain/staff-absence";
const range = (startDate: string, endDate: string, timezone = "Europe/Berlin") => ({
  kind: "full-day" as const,
  timezone,
  startDate,
  endDate,
});
describe("Private absence ranges and neutral interval history", () => {
  it("validates calendar dates, positive ranges, duration, timezone and strict fields", () => {
    for (const value of [
      range("2026-02-30", "2026-03-02"),
      range("2026-11-09", "2026-11-09"),
      range("2026-11-09", "2026-11-08"),
      range("2026-11-09", "2028-11-10"),
      range("2026-11-09", "2026-11-10", "Invalid/Zone"),
    ])
      expect(RecordStaffAbsenceSchema.safeParse({ range: value, reason: "private" }).success).toBe(
        false
      );
    expect(
      RecordStaffAbsenceSchema.safeParse({
        range: range("2026-11-09", "2026-11-10"),
        reason: "private",
        tenantId: "forged",
      }).success
    ).toBe(false);
  });
  it("uses exclusive civil-day ends including 23/25-hour days and skipped dates", () => {
    expect(absenceInterval(range("2027-03-28", "2027-03-29"))).toEqual({
      startAt: "2027-03-27T23:00:00.000Z",
      endAt: "2027-03-28T22:00:00.000Z",
    });
    expect(absenceInterval(range("2027-10-31", "2027-11-01"))).toEqual({
      startAt: "2027-10-30T22:00:00.000Z",
      endAt: "2027-10-31T23:00:00.000Z",
    });
    expect(() => absenceInterval(range("2011-12-30", "2011-12-31", "Pacific/Apia"))).toThrow();
  });
  it("uses explicit instants for partial-day fold/overnight intervals", () => {
    expect(
      absenceInterval({
        kind: "partial-day",
        timezone: "Europe/Berlin",
        startAt: "2027-10-31T00:30:00Z",
        endAt: "2027-10-31T01:30:00Z",
      })
    ).toEqual({ startAt: "2027-10-31T00:30:00.000Z", endAt: "2027-10-31T01:30:00.000Z" });
  });
  it("keeps elapsed blocks after correction/cancellation and subtracts half-open intervals", () => {
    const original = {
      range: range("2026-11-09", "2026-11-12"),
      reason: "secret",
      notes: "private",
      version: 1,
      status: "approved" as const,
      startAt: "2026-11-09T00:00:00.000Z",
      endAt: "2026-11-12T00:00:00.000Z",
      changedAt: "2026-11-08T00:00:00.000Z",
      changedBy: "manager",
    };
    const record: StaffAbsence = {
      id: "absence",
      staffId: "staff",
      workspaceId: "workspace",
      revisions: [
        original,
        {
          ...original,
          version: 2,
          changedAt: "2026-11-10T12:00:00.000Z",
          endAt: "2026-11-11T00:00:00.000Z",
        },
        { ...original, version: 3, status: "cancelled", changedAt: "2026-11-10T14:00:00.000Z" },
      ],
    };
    const blocks = absenceBlocks([record]);
    expect(blocks).toEqual([
      { startAt: original.startAt, endAt: "2026-11-10T12:00:00.000Z" },
      { startAt: "2026-11-10T12:00:00.000Z", endAt: "2026-11-10T14:00:00.000Z" },
    ]);
    expect(
      subtractAbsences(
        [{ startAt: "2026-11-10T10:00:00.000Z", endAt: "2026-11-10T16:00:00.000Z" }],
        blocks
      )
    ).toEqual([{ startAt: "2026-11-10T14:00:00.000Z", endAt: "2026-11-10T16:00:00.000Z" }]);
    expect(JSON.stringify(blocks)).not.toMatch(/secret|private|reason|notes|changedBy/);
  });
});
