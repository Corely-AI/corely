/**
 * Unit tests for DE deductibility computation service
 *
 * Tests cover all four rule kinds and edge-cases:
 * - PercentRule (0, 70, 100)
 * - GiftThresholdRule (within / over limit)
 * - PerDiemRule (travel meals: < 8h, ≥ 8h, 24h; home office with cap)
 * - MixedUseRule (with / without businessUsePercent)
 * - Unknown category fallback
 */

import { describe, it, expect } from "vitest";
import { computeDeDeductibility } from "../../../domain/de-deductibility.service";
import {
  DE_GIFT_THRESHOLD_CENTS,
  DE_HOME_OFFICE_ANNUAL_CAP_CENTS,
  DE_HOME_OFFICE_PER_DAY_CENTS,
  DE_TRAVEL_MEAL_FULL_DAY_CENTS,
  DE_TRAVEL_MEAL_PARTIAL_DAY_CENTS,
} from "../../../domain/de-deductibility.constants";

// ---------------------------------------------------------------------------
// 1. PercentRule
// ---------------------------------------------------------------------------

describe("computeDeDeductibility – PercentRule 100%", () => {
  it("100% for MEALS_TEAM_EMPLOYEE", () => {
    const result = computeDeDeductibility({
      category: "MEALS_TEAM_EMPLOYEE",
      totalAmountCents: 10_000,
      meta: null,
    });
    expect(result.deductiblePercent).toBe(100);
    expect(result.deductibleAmountCents).toBe(10_000);
    expect(result.nonDeductibleAmountCents).toBe(0);
    expect(result.ruleKind).toBe("PERCENT");
  });

  it("0% for FINES_PENALTIES", () => {
    const result = computeDeDeductibility({
      category: "FINES_PENALTIES",
      totalAmountCents: 5_000,
      meta: null,
    });
    expect(result.deductiblePercent).toBe(0);
    expect(result.deductibleAmountCents).toBe(0);
    expect(result.nonDeductibleAmountCents).toBe(5_000);
  });

  it("70% for MEALS_CLIENT_ENTERTAINMENT", () => {
    const result = computeDeDeductibility({
      category: "MEALS_CLIENT_ENTERTAINMENT",
      totalAmountCents: 10_000,
      meta: { participants: "Alice, Bob", occasion: "Project kickoff" },
    });
    expect(result.deductiblePercent).toBe(70);
    expect(result.deductibleAmountCents).toBe(7_000);
    expect(result.nonDeductibleAmountCents).toBe(3_000);
  });
});

// ---------------------------------------------------------------------------
// 2. GiftThresholdRule
// ---------------------------------------------------------------------------

describe("computeDeDeductibility – GiftThresholdRule", () => {
  const threshold = DE_GIFT_THRESHOLD_CENTS; // 5000

  it("within threshold → 100% deductible", () => {
    const result = computeDeDeductibility({
      category: "GIFTS_BUSINESS_PARTNER",
      totalAmountCents: 3_000,
      meta: { recipient: "Acme Corp" },
      priorGiftCentsThisYear: 0,
    });
    expect(result.deductiblePercent).toBe(100);
    expect(result.deductibleAmountCents).toBe(3_000);
  });

  it("total = threshold exactly → still within (100%)", () => {
    const result = computeDeDeductibility({
      category: "GIFTS_BUSINESS_PARTNER",
      totalAmountCents: 5_000,
      meta: { recipient: "Acme Corp" },
      priorGiftCentsThisYear: 0,
    });
    expect(result.deductiblePercent).toBe(100);
  });

  it("total exceeds threshold → 0% deductible", () => {
    const result = computeDeDeductibility({
      category: "GIFTS_BUSINESS_PARTNER",
      totalAmountCents: 2_000,
      meta: { recipient: "Acme Corp" },
      priorGiftCentsThisYear: threshold, // already at limit
    });
    expect(result.deductiblePercent).toBe(0);
    expect(result.nonDeductibleAmountCents).toBe(2_000);
  });

  it("missing recipient → not computed (null)", () => {
    const result = computeDeDeductibility({
      category: "GIFTS_BUSINESS_PARTNER",
      totalAmountCents: 2_000,
      meta: {},
    });
    expect(result.deductiblePercent).toBeNull();
    expect(result.ruleKind).toBe("GIFT_THRESHOLD_PER_RECIPIENT_YEAR");
  });
});

// ---------------------------------------------------------------------------
// 3. PerDiemRule – travel meals
// ---------------------------------------------------------------------------

describe("computeDeDeductibility – PerDiemRule (DE_TRAVEL_MEALS)", () => {
  it("< 8h → 0% deductible", () => {
    const result = computeDeDeductibility({
      category: "TRAVEL_MEALS_PER_DIEM",
      totalAmountCents: 2_000,
      meta: { travelMeta: { date: "2026-03-01", absenceHours: 6, country: "DE" } },
    });
    expect(result.deductiblePercent).toBe(0);
    expect(result.deductibleAmountCents).toBe(0);
  });

  it("8h → €14 per-diem", () => {
    const meal = 1_200; // expense < per-diem
    const result = computeDeDeductibility({
      category: "TRAVEL_MEALS_PER_DIEM",
      totalAmountCents: meal,
      meta: { travelMeta: { date: "2026-03-01", absenceHours: 8, country: "DE" } },
    });
    expect(result.deductibleAmountCents).toBe(meal); // capped at actual expense
    expect(result.deductiblePercent).toBe(100);
  });

  it("8h, expense > per-diem → deductible capped at €14", () => {
    const result = computeDeDeductibility({
      category: "TRAVEL_MEALS_PER_DIEM",
      totalAmountCents: 3_000, // > €14
      meta: { travelMeta: { date: "2026-03-01", absenceHours: 9, country: "DE" } },
    });
    expect(result.deductibleAmountCents).toBe(DE_TRAVEL_MEAL_PARTIAL_DAY_CENTS);
    expect(result.nonDeductibleAmountCents).toBe(3_000 - DE_TRAVEL_MEAL_PARTIAL_DAY_CENTS);
  });

  it("24h → €28 per-diem", () => {
    const result = computeDeDeductibility({
      category: "TRAVEL_MEALS_PER_DIEM",
      totalAmountCents: 5_000,
      meta: { travelMeta: { date: "2026-03-01", absenceHours: 24, country: "DE" } },
    });
    expect(result.deductibleAmountCents).toBe(DE_TRAVEL_MEAL_FULL_DAY_CENTS);
  });

  it("missing travelMeta → null", () => {
    const result = computeDeDeductibility({
      category: "TRAVEL_MEALS_PER_DIEM",
      totalAmountCents: 1_000,
      meta: null,
    });
    expect(result.deductiblePercent).toBeNull();
    expect(result.ruleKind).toBe("PER_DIEM");
  });
});

// ---------------------------------------------------------------------------
// 4. PerDiemRule – home office
// ---------------------------------------------------------------------------

describe("computeDeDeductibility – PerDiemRule (DE_HOME_OFFICE)", () => {
  const perDay = DE_HOME_OFFICE_PER_DAY_CENTS;
  const cap = DE_HOME_OFFICE_ANNUAL_CAP_CENTS;

  it("30 days → 30 × €6 = €180", () => {
    const result = computeDeDeductibility({
      category: "HOME_OFFICE_FLAT_RATE",
      totalAmountCents: 20_000,
      meta: { homeOfficeDays: 30 },
    });
    expect(result.deductibleAmountCents).toBe(30 * perDay);
    expect(result.nonDeductibleAmountCents).toBe(20_000 - 30 * perDay);
  });

  it("annual cap applied at 210 days (210 × €6 = €1260)", () => {
    const result = computeDeDeductibility({
      category: "HOME_OFFICE_FLAT_RATE",
      totalAmountCents: 200_000,
      meta: { homeOfficeDays: 210 },
    });
    expect(result.deductibleAmountCents).toBe(cap);
  });

  it("missing homeOfficeDays → null", () => {
    const result = computeDeDeductibility({
      category: "HOME_OFFICE_FLAT_RATE",
      totalAmountCents: 1_000,
      meta: null,
    });
    expect(result.deductiblePercent).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// 5. MixedUseRule
// ---------------------------------------------------------------------------

describe("computeDeDeductibility – MixedUseRule", () => {
  it("60% business use → 60% deductible", () => {
    const result = computeDeDeductibility({
      category: "PHONE_INTERNET",
      totalAmountCents: 10_000,
      meta: { businessUsePercent: 60 },
    });
    expect(result.deductiblePercent).toBe(60);
    expect(result.deductibleAmountCents).toBe(6_000);
    expect(result.nonDeductibleAmountCents).toBe(4_000);
  });

  it("missing businessUsePercent → null", () => {
    const result = computeDeDeductibility({
      category: "PHONE_INTERNET",
      totalAmountCents: 10_000,
      meta: null,
    });
    expect(result.deductiblePercent).toBeNull();
    expect(result.ruleKind).toBe("MIXED_USE");
  });
});

// ---------------------------------------------------------------------------
// 6. Edge cases
// ---------------------------------------------------------------------------

describe("computeDeDeductibility – edge cases", () => {
  it("null category → null deductiblePercent", () => {
    const result = computeDeDeductibility({
      category: null,
      totalAmountCents: 1_000,
      meta: null,
    });
    expect(result.deductiblePercent).toBeNull();
  });

  it("unknown category → 100% deductible (conservative default)", () => {
    const result = computeDeDeductibility({
      category: "TOTALLY_UNKNOWN_CATEGORY",
      totalAmountCents: 5_000,
      meta: null,
    });
    expect(result.deductiblePercent).toBe(100);
  });
});
