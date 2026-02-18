import React from "react";
import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { DealAiInsightsCard } from "./DealAiInsightsCard";
import { DealAiRecommendationsCard } from "./DealAiRecommendationsCard";

describe("CRM Deal AI cards", () => {
  it("renders insights content and handles generate action", async () => {
    const onGenerate = vi.fn();
    const user = userEvent.setup();

    render(
      <DealAiInsightsCard
        enabled
        offline={false}
        loading={false}
        error={null}
        onGenerate={onGenerate}
        insights={{
          dealId: "deal-1",
          summary: {
            situation: "Active opportunity",
            lastInteraction: "Called yesterday",
            keyStakeholders: "John Doe",
            needs: "Pricing confirmation",
            objections: "Budget",
            nextStep: "Send proposal",
          },
          whatMissing: [{ code: "next", label: "No next activity", severity: "high" }],
          keyEntities: [{ kind: "person", value: "John Doe" }],
          confidence: 0.74,
          freshnessTimestamp: "2026-02-17T10:00:00.000Z",
          sourceActivityCount: 3,
          timelineEmpty: false,
          cached: false,
        }}
      />
    );

    expect(screen.getByText("AI Insights")).toBeInTheDocument();
    expect(screen.getByText(/Active opportunity/)).toBeInTheDocument();
    expect(screen.getByText(/No next activity/)).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Generate insights" }));
    expect(onGenerate).toHaveBeenCalledTimes(1);
  });

  it("renders recommendations and calls apply callback", async () => {
    const onApply = vi.fn();
    const user = userEvent.setup();

    render(
      <DealAiRecommendationsCard
        enabled
        offline={false}
        loading={false}
        error={null}
        onRefresh={vi.fn()}
        onApply={onApply}
        recommendations={[
          {
            type: "scheduleTask",
            id: "rec-1",
            title: "Schedule next task",
            reason: "No follow-up planned",
            confidence: 0.9,
            subject: "Follow up on proposal",
            suggestedDueAt: "2026-02-18T10:00:00.000Z",
            toolCard: {
              toolCardType: "createActivity",
              title: "Create follow-up",
              confirmationLabel: "Create task",
              payload: {
                type: "TASK",
                subject: "Follow up on proposal",
                dealId: "deal-1",
                partyId: "party-1",
              },
            },
          },
        ]}
      />
    );

    expect(screen.getByText("Next Best Actions")).toBeInTheDocument();
    expect(screen.getByText("Schedule next task")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Apply" }));
    expect(onApply).toHaveBeenCalledTimes(1);
    expect(onApply.mock.calls[0]?.[0]?.id).toBe("rec-1");
  });
});
