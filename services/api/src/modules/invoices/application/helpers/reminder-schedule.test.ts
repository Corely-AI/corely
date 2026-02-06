import { describe, expect, it } from "vitest";
import { computeNextReminderAt } from "./reminder-schedule";
import { formatInTimeZone, fromZonedTime } from "date-fns-tz";

describe("computeNextReminderAt", () => {
  it("adjusts to weekday when configured", async () => {
    const tz = "Europe/Berlin";
    const baseInstant = fromZonedTime("2026-02-06T10:00:00", tz); // Friday
    const next = await computeNextReminderAt({
      tenantTimeZone: tz,
      baseInstant,
      intervalDays: 1, // Saturday
      sendOnlyOnWeekdays: true,
    });

    const localDate = formatInTimeZone(next, tz, "yyyy-MM-dd");
    const localDay = Number(formatInTimeZone(next, tz, "i"));
    expect(localDate).toBe("2026-02-09");
    expect(localDay).toBe(1);
  });

  it("keeps weekend when weekday-only is disabled", async () => {
    const tz = "Europe/Berlin";
    const baseInstant = fromZonedTime("2026-02-06T10:00:00", tz); // Friday
    const next = await computeNextReminderAt({
      tenantTimeZone: tz,
      baseInstant,
      intervalDays: 1,
      sendOnlyOnWeekdays: false,
    });

    const localDate = formatInTimeZone(next, tz, "yyyy-MM-dd");
    const localDay = Number(formatInTimeZone(next, tz, "i"));
    expect(localDate).toBe("2026-02-07");
    expect(localDay).toBe(6);
  });
});
