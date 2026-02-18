import { describe, expect, it } from "vitest";
import { computeDealAiAnalytics } from "../deal-ai-analytics";

describe("computeDealAiAnalytics", () => {
  it("marks deal as stalled with low probability when activity is stale", () => {
    const now = new Date("2026-02-17T10:00:00.000Z");
    const result = computeDealAiAnalytics(
      {
        stageId: "proposal",
        stageConversion: { won: 2, closed: 12 },
        stageMedianDays: 6,
        stageRemainingP50Days: 12,
        stageRemainingP80Days: 20,
        stageSampleSize: 12,
        wonSampleSize: 4,
      },
      {
        stageId: "proposal",
        expectedCloseDate: null,
        amountCents: null,
        hasLinkedContact: false,
        stageEnteredAt: new Date("2026-01-20T10:00:00.000Z"),
        lastActivityAt: new Date("2026-01-25T10:00:00.000Z"),
        activityCount: 1,
        now,
      }
    );

    expect(result.status).toBe("STALLED");
    expect(result.winProbability).toBeLessThan(0.3);
    expect(result.lowConfidence).toBe(true);
    expect(result.topFactors.length).toBeGreaterThan(0);
  });

  it("marks deal as good with higher probability when activity is recent and data is present", () => {
    const now = new Date("2026-02-17T10:00:00.000Z");
    const result = computeDealAiAnalytics(
      {
        stageId: "negotiation",
        stageConversion: { won: 14, closed: 20 },
        stageMedianDays: 12,
        stageRemainingP50Days: 9,
        stageRemainingP80Days: 16,
        stageSampleSize: 24,
        wonSampleSize: 20,
      },
      {
        stageId: "negotiation",
        expectedCloseDate: new Date("2026-03-01T00:00:00.000Z"),
        amountCents: 750000,
        hasLinkedContact: true,
        stageEnteredAt: new Date("2026-02-12T10:00:00.000Z"),
        lastActivityAt: new Date("2026-02-16T10:00:00.000Z"),
        activityCount: 8,
        now,
      }
    );

    expect(result.status).toBe("GOOD");
    expect(result.winProbability).toBeGreaterThan(0.65);
    expect(result.lowConfidence).toBe(false);
    expect(result.forecastRange?.p50CloseDate).toBe("2026-02-26");
    expect(result.forecastRange?.p80CloseDate).toBe("2026-03-05");
  });

  it("returns forecast range only when historical forecast signals exist", () => {
    const now = new Date("2026-02-17T10:00:00.000Z");
    const withForecast = computeDealAiAnalytics(
      {
        stageId: "qualified",
        stageConversion: { won: 5, closed: 10 },
        stageMedianDays: 8,
        stageRemainingP50Days: 15,
        stageRemainingP80Days: 24,
        stageSampleSize: 10,
        wonSampleSize: 10,
      },
      {
        stageId: "qualified",
        expectedCloseDate: null,
        amountCents: 100000,
        hasLinkedContact: true,
        stageEnteredAt: new Date("2026-02-10T00:00:00.000Z"),
        lastActivityAt: new Date("2026-02-16T00:00:00.000Z"),
        activityCount: 3,
        now,
      }
    );
    const withoutForecast = computeDealAiAnalytics(
      {
        stageId: "qualified",
        stageConversion: { won: 1, closed: 2 },
        stageMedianDays: null,
        stageRemainingP50Days: null,
        stageRemainingP80Days: null,
        stageSampleSize: 2,
        wonSampleSize: 2,
      },
      {
        stageId: "qualified",
        expectedCloseDate: null,
        amountCents: 100000,
        hasLinkedContact: true,
        stageEnteredAt: new Date("2026-02-10T00:00:00.000Z"),
        lastActivityAt: new Date("2026-02-16T00:00:00.000Z"),
        activityCount: 3,
        now,
      }
    );

    expect(withForecast.forecastRange).not.toBeNull();
    expect(withForecast.forecastCloseDate).toBe("2026-03-04");
    expect(withoutForecast.forecastRange).toBeNull();
    expect(withoutForecast.forecastCloseDate).toBeNull();
  });
});
