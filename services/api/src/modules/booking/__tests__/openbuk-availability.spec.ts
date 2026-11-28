import { describe, expect, it } from "vitest";
import {
  OpenBukAvailabilityQuerySchema,
  OpenBukBookSchema,
  OpenBukSetupSchema,
} from "@corely/contracts";
import { openBukAvailability, studioDate } from "../domain/openbuk-availability";
import { studioFixture } from "./openbuk-fixtures";
const now = new Date("2026-10-01T00:00:00Z");
describe("OpenBuk availability", () => {
  it("converts local working hours to instants, includes buffers, excludes closed days", () => {
    const slots = openBukAvailability(studioFixture(), "2026-10-05", now, []);
    expect(slots[0]).toEqual({
      startAt: "2026-10-05T07:00:00.000Z",
      endAt: "2026-10-05T07:45:00.000Z",
    });
    expect(slots.at(-1)?.startAt).toBe("2026-10-05T15:00:00.000Z");
    expect(openBukAvailability(studioFixture(), "2026-10-06", now, [])).toEqual([]);
  });
  it("blocks both appointment and buffer overlap with half-open boundaries", () => {
    const slots = openBukAvailability(
      studioFixture({
        blockedTimes: [{ startAt: "2026-10-05T08:00:00Z", endAt: "2026-10-05T09:00:00Z" }],
      }),
      "2026-10-05",
      now,
      []
    );
    expect(slots.map((s) => s.startAt)).toContain("2026-10-05T07:00:00.000Z");
    expect(slots.map((s) => s.startAt)).not.toContain("2026-10-05T07:15:00.000Z");
    expect(slots.map((s) => s.startAt)).toContain("2026-10-05T09:00:00.000Z");
  });
  it("accounts for busy resources, notice, horizon and breaks", () => {
    const studio = studioFixture({
      bufferBeforeMinutes: 15,
      minimumNoticeMinutes: 90,
      maximumAdvanceDays: 1,
      weeklyHours: [
        { dayOfWeek: 1, startTime: "09:00", endTime: "12:00" },
        { dayOfWeek: 1, startTime: "13:00", endTime: "18:00" },
      ],
    });
    const slots = openBukAvailability(studio, "2026-10-05", new Date("2026-10-05T07:00:00Z"), [
      { startAt: new Date("2026-10-05T09:00:00Z"), endAt: new Date("2026-10-05T10:00:00Z") },
    ]);
    expect(slots[0]?.startAt).toBe("2026-10-05T11:15:00.000Z");
    expect(openBukAvailability(studio, "2026-10-12", now, [])).toEqual([]);
  });
  it("does not invent times in the spring DST gap", () => {
    const s = studioFixture({
      durationMinutes: 15,
      bufferAfterMinutes: 0,
      weeklyHours: [{ dayOfWeek: 0, startTime: "01:00", endTime: "04:00" }],
    });
    const slots = openBukAvailability(s, "2026-03-29", new Date("2026-03-01Z"), []);
    expect(slots).toHaveLength(8);
    expect(slots.map((v) => v.startAt)).toContain("2026-03-29T01:00:00.000Z");
  });
  it("keeps repeated fall DST wall times as distinct bookable instants", () => {
    const s = studioFixture({
      durationMinutes: 15,
      bufferAfterMinutes: 0,
      weeklyHours: [{ dayOfWeek: 0, startTime: "02:00", endTime: "03:00" }],
    });
    const slots = openBukAvailability(s, "2026-10-25", now, []);
    expect(slots).toHaveLength(8);
    expect(slots[0]?.startAt).toBe("2026-10-25T00:00:00.000Z");
    expect(slots[4]?.startAt).toBe("2026-10-25T01:00:00.000Z");
  });
  it("handles date rollover and fractional timezone offsets", () => {
    const s = studioFixture({ timezone: "Asia/Kathmandu" });
    expect(openBukAvailability(s, "2026-10-05", now, [])[0]?.startAt).toBe(
      "2026-10-05T03:15:00.000Z"
    );
    expect(studioDate(new Date("2026-10-04T23:00:00Z"), "Asia/Kathmandu")).toBe("2026-10-05");
  });
  it("respects the effective schedule interval including buffers", () => {
    const slots = openBukAvailability(
      studioFixture({
        effectiveFrom: "2026-10-05T08:00:00Z",
        effectiveTo: "2026-10-05T10:00:00Z",
      }),
      "2026-10-05",
      now,
      []
    );
    expect(slots[0]?.startAt).toBe("2026-10-05T08:00:00.000Z");
    expect(slots.at(-1)?.endAt).toBe("2026-10-05T09:45:00.000Z");
  });
  it("rejects invalid dates, client pricing, invalid hours and timezones", () => {
    expect(OpenBukAvailabilityQuerySchema.safeParse({ day: "2026-02-30" }).success).toBe(false);
    expect(
      OpenBukBookSchema.safeParse({
        serviceId: "s",
        staffId: "r",
        startAt: "2026-10-05T07:00:00Z",
        customer: { name: "Guest", email: "guest@example.test" },
        consentAccepted: true,
        priceCents: 1,
      }).success
    ).toBe(false);
    const { serviceId, staffId, slug, ...setup } = studioFixture();
    expect(OpenBukSetupSchema.safeParse({ ...setup, timezone: "invalid" }).success).toBe(false);
    expect(
      OpenBukSetupSchema.safeParse({
        ...setup,
        weeklyHours: [{ dayOfWeek: 1, startTime: "18:00", endTime: "09:00" }],
      }).success
    ).toBe(false);
  });
});
