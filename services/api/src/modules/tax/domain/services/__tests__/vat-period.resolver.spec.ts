import { Test, TestingModule } from "@nestjs/testing";
import { VatPeriodResolver } from "../vat-period.resolver";

describe("VatPeriodResolver", () => {
  let resolver: VatPeriodResolver;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [VatPeriodResolver],
    }).compile();

    resolver = module.get<VatPeriodResolver>(VatPeriodResolver);
  });

  it("should be defined", () => {
    expect(resolver).toBeDefined();
  });

  describe("resolveQuarter (date)", () => {
    it("should resolve Q1 correctly", () => {
      // Jan 1st
      const d1 = new Date("2025-01-01T00:00:00Z");
      const p1 = resolver.resolveQuarter(d1);
      expect(p1.key).toBe("2025-Q1");
      expect(p1.start.toISOString()).toBe("2025-01-01T00:00:00.000Z");
      expect(p1.end.toISOString()).toBe("2025-04-01T00:00:00.000Z");

      // Mar 31st
      const d2 = new Date("2025-03-31T23:59:59.999Z");
      const p2 = resolver.resolveQuarter(d2);
      expect(p2.key).toBe("2025-Q1");
    });

    it("should resolve Q4 correctly", () => {
      // Oct 1st
      const d1 = new Date("2025-10-01T00:00:00Z");
      const p1 = resolver.resolveQuarter(d1);
      expect(p1.key).toBe("2025-Q4");
      expect(p1.start.toISOString()).toBe("2025-10-01T00:00:00.000Z");
      expect(p1.end.toISOString()).toBe("2026-01-01T00:00:00.000Z");
    });

    it("should handle boundary conditions", () => {
      // Sep 30
      const sep30 = new Date("2025-09-30T12:00:00Z");
      expect(resolver.resolveQuarter(sep30).key).toBe("2025-Q3");

      // Oct 1
      const oct1 = new Date("2025-10-01T00:00:00Z");
      expect(resolver.resolveQuarter(oct1).key).toBe("2025-Q4");

      // Dec 31
      const dec31 = new Date("2025-12-31T23:59:59Z");
      expect(resolver.resolveQuarter(dec31).key).toBe("2025-Q4");

      // Jan 1 next year
      const jan1 = new Date("2026-01-01T00:00:00Z");
      expect(resolver.resolveQuarter(jan1).key).toBe("2026-Q1");
    });
  });

  describe("resolveQuarter (key)", () => {
    it("should parse key correctly", () => {
      const p = resolver.resolveQuarter("2025-Q2");
      expect(p.key).toBe("2025-Q2");
      expect(p.start.toISOString()).toBe("2025-04-01T00:00:00.000Z");
      expect(p.end.toISOString()).toBe("2025-07-01T00:00:00.000Z");
    });
  });
});
