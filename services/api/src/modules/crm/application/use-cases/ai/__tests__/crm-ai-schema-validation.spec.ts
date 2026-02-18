import { describe, expect, it } from "vitest";
import {
  ActivityAiExtractOutputSchema,
  DealAiInsightsSchema,
  GetDealAiInsightsOutputSchema,
} from "@corely/contracts";

describe("CRM AI schema validation", () => {
  it("rejects invalid deal insights payloads", () => {
    const parsed = DealAiInsightsSchema.safeParse({
      dealId: "deal-1",
      summary: {
        situation: "Some context",
        lastInteraction: "Yesterday",
        keyStakeholders: "Buyer",
        needs: "Need pricing",
        objections: "Budget",
        nextStep: "Follow up",
      },
      whatMissing: [],
      keyEntities: [],
      confidence: 1.4,
      freshnessTimestamp: "2026-02-17T00:00:00.000Z",
      sourceActivityCount: 0,
      timelineEmpty: true,
      cached: false,
    });

    expect(parsed.success).toBe(false);
  });

  it("accepts valid deal insights response envelope", () => {
    const parsed = GetDealAiInsightsOutputSchema.safeParse({
      insights: {
        dealId: "deal-1",
        summary: {
          situation: "Opportunity is active",
          lastInteraction: "No activity recorded yet",
          keyStakeholders: "Unknown",
          needs: "Unknown",
          objections: "Unknown",
          nextStep: "Create next task",
        },
        whatMissing: [{ code: "next-activity-missing", label: "No next activity is scheduled" }],
        keyEntities: [],
        confidence: 0.52,
        freshnessTimestamp: "2026-02-17T00:00:00.000Z",
        sourceActivityCount: 0,
        timelineEmpty: true,
        cached: false,
      },
      health: {
        dealId: "deal-1",
        status: "AT_RISK",
        explanation: "Deal has risk signals.",
        winProbability: 0.45,
        confidence: 0.41,
        lowConfidence: true,
        forecastCloseDate: null,
        forecastRange: null,
        topFactors: [],
        computedAt: "2026-02-17T00:00:00.000Z",
      },
    });

    expect(parsed.success).toBe(true);
  });

  it("ensures follow-up tool-cards are shaped correctly", () => {
    const parsed = ActivityAiExtractOutputSchema.safeParse({
      result: {
        summary: "Customer asked for updated quote and timeline.",
        actionItems: [
          {
            subject: "Send revised quote",
            details: "Include annual pricing option",
            suggestedType: "TASK",
            confidence: 0.72,
          },
        ],
        confidence: 0.72,
      },
      followUpToolCards: [
        {
          toolCardType: "createActivity",
          title: "Create follow-up: Send revised quote",
          confirmationLabel: "Create follow-up",
          payload: {
            type: "TASK",
            subject: "Send revised quote",
            body: "Include annual pricing option",
          },
        },
      ],
    });

    expect(parsed.success).toBe(true);
  });
});
