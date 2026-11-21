import { describe, expect, it } from "vitest";
import { validateNewBooking } from "@corely/booking/extensions";
import { acmeBookingPolicy } from "@acme/booking-policy-fixture";

const scope = { tenantId: "tenant-acme", workspaceId: "workspace-acme" };
const policies = [{ ...scope, validate: acmeBookingPolicy }];
const hour = 3_600_000;

describe("customer booking policy", () => {
  it.each([
    [120, 47, true],
    [120, 48, false],
    [90, 47, false],
  ])("evaluates a %i minute booking %i hours ahead", (duration, notice, rejected) => {
    const times = {
      nowMs: 0,
      startAtMs: notice * hour,
      endAtMs: notice * hour + duration * 60_000,
    };
    expect(Boolean(validateNewBooking(policies, scope, times))).toBe(rejected);
    expect(validateNewBooking(policies, { ...scope, workspaceId: "other" }, times)).toBeUndefined();
    expect(validateNewBooking(policies, { ...scope, tenantId: "other" }, times)).toBeUndefined();
  });
});
