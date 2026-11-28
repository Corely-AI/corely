import { describe, expect, it } from "vitest";
import type { OpenBukImportConfirmedRow } from "@corely/contracts";
import { matchesSourceTime, sourceTimezone } from "../domain/openbuk-import-time";

const timezone = sourceTimezone("Europe/Berlin");
const visit = (startAt: string, endAt: string): OpenBukImportConfirmedRow => ({
  sourceId: "test-booking",
  sourceServiceId: "service",
  sourceStaffId: "staff",
  status: "CONFIRMED",
  startAt,
  endAt,
  currency: "EUR",
  priceCents: 3000,
  customer: { name: "Test", email: "fixture@example.invalid" },
});
describe("Booking import wall time", () => {
  it("requires a consistent explicit offset for each side of a repeated hour", () => {
    expect(
      matchesSourceTime(visit("2026-10-25T02:00:00+02:00", "2026-10-25T02:45:00+02:00"), timezone)
    ).toBe(true);
    expect(
      matchesSourceTime(visit("2026-10-25T02:00:00+01:00", "2026-10-25T02:45:00+01:00"), timezone)
    ).toBe(true);
    expect(
      matchesSourceTime(visit("2026-10-25T02:00:00+02:30", "2026-10-25T02:45:00+02:30"), timezone)
    ).toBe(false);
  });
  it("rejects nonexistent local times and reverse intervals", () => {
    expect(
      matchesSourceTime(visit("2026-03-29T02:00:00+01:00", "2026-03-29T04:00:00+02:00"), timezone)
    ).toBe(false);
    expect(
      matchesSourceTime(visit("2026-03-29T04:00:00+02:00", "2026-03-29T03:00:00+02:00"), timezone)
    ).toBe(false);
  });
});
