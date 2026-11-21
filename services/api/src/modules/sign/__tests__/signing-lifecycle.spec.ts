import { describe, expect, it } from "vitest";
import {
  effectiveCeremonyStatus,
  signingProgress,
  validSigningExpiry,
} from "../domain/signing-lifecycle";

describe("signing lifecycle", () => {
  const now = new Date("2026-01-01T00:00:00Z");
  it("allows a future expiry up to and including 90 days", () => {
    const last = now.getTime() + 90 * 86400000;
    expect(validSigningExpiry(now, now)).toBe(false);
    expect(validSigningExpiry(new Date(last), now)).toBe(true);
    expect(validSigningExpiry(new Date(last + 1), now)).toBe(false);
  });
  it("expires an outstanding ceremony at the deadline and preserves a collected request", () => {
    expect(effectiveCeremonyStatus(null, now)).toBe("DRAFT");
    expect(effectiveCeremonyStatus({ status: "SENT", expiresAt: now }, now)).toBe("EXPIRED");
    expect(effectiveCeremonyStatus({ status: "COLLECTED", expiresAt: now }, now)).toBe("COLLECTED");
  });
  const first = { position: 0, status: "WAITING" };
  const second = { position: 1, status: "WAITING" };
  it("invites sequential recipients in position order and waits for the active signer", () => {
    expect(signingProgress("sequential", [second, first]).toInvite).toEqual([first]);
    expect(
      signingProgress("sequential", [second, { ...first, status: "INVITED" }]).toInvite
    ).toEqual([]);
    expect(
      signingProgress("sequential", [second, { ...first, status: "ACCEPTED" }]).toInvite
    ).toEqual([second]);
  });
  it("invites all waiting parallel recipients once", () => {
    expect(signingProgress("parallel", [first, second]).toInvite).toEqual([first, second]);
    expect(signingProgress("parallel", [{ ...first, status: "INVITED" }, second]).toInvite).toEqual(
      [second]
    );
  });
  it("collects only when every recipient has accepted", () => {
    expect(signingProgress("parallel", []).collected).toBe(false);
    expect(signingProgress("parallel", [first]).collected).toBe(false);
    expect(signingProgress("sequential", [{ ...first, status: "ACCEPTED" }])).toEqual({
      collected: true,
      toInvite: [],
    });
  });
});
