import { describe, it, expect } from "vitest";
import { VatPeriodResolver } from "../vat-period.resolver";

describe("VatPeriodResolver", () => {
  const resolver = new VatPeriodResolver();

  it("resolves Q4 boundaries with UTC half-open range", () => {
    const period = resolver.resolveQuarter("2025-Q4");
    expect(period.start.toISOString()).toBe("2025-10-01T00:00:00.000Z");
    expect(period.end.toISOString()).toBe("2026-01-01T00:00:00.000Z");
  });

  it("uses UTC month boundaries when resolving from dates", () => {
    const period = resolver.resolveQuarter(new Date("2025-12-31T23:59:59.000Z"));
    expect(period.key).toBe("2025-Q4");
  });

  it("handles timezone offsets safely", () => {
    const period = resolver.resolveQuarter(new Date("2025-03-31T23:30:00-05:00"));
    expect(period.key).toBe("2025-Q2");
  });
});
