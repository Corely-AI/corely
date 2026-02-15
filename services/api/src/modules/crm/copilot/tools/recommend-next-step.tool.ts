import { Injectable } from "@nestjs/common";
import { z } from "zod";
import { GetDealByIdUseCase } from "../../application/use-cases/get-deal-by-id/get-deal-by-id.usecase";
import { GetTimelineUseCase } from "../../application/use-cases/get-timeline/get-timeline.usecase";
import { DomainToolPort, ToolKind } from "../../../ai-copilot/application/ports/domain-tool.port";
import { addDays, isBefore } from "date-fns";

const InputSchema = z.object({
  dealId: z.string().describe("ID of the deal to analyze"),
});

@Injectable()
export class RecommendNextStepTool implements DomainToolPort {
  name = "crm_recommend_next_step";
  description = "Analyzes deal activity to recommend the next best action.";
  inputSchema = InputSchema;
  kind: ToolKind = "server";
  needsApproval = false;

  constructor(
    private readonly getDeal: GetDealByIdUseCase,
    private readonly getTimeline: GetTimelineUseCase
  ) {}

  execute = async (params: { tenantId: string; userId: string; input: unknown }) => {
    const { dealId } = InputSchema.parse(params.input);

    const dealResult = await this.getDeal.execute({ dealId } as any, { tenantId: params.tenantId });
    if (!dealResult.ok) {throw (dealResult as any).error;}
    const deal = dealResult.value.deal;

    const timelineResult = await this.getTimeline.execute(
      { entityType: "deal", entityId: dealId, limit: 10 },
      { tenantId: params.tenantId }
    );
    if (!timelineResult.ok) {throw (timelineResult as any).error;}
    const activities = timelineResult.value.items.filter((i) => i.type === "ACTIVITY");

    // Rule-based logic
    if (activities.length === 0) {
      return { recommendation: "No activity found. Schedule an introductory call immediately." };
    }

    const lastActivity = activities[0];
    const lastDate = lastActivity.timestamp ? new Date(lastActivity.timestamp) : new Date();
    const now = new Date();

    if (isBefore(lastDate, addDays(now, -14))) {
      return {
        recommendation:
          "Deal is at risk (inactive for > 14 days). Send a re-engagement email or mark as 'Lost'.",
      };
    }

    if (isBefore(lastDate, addDays(now, -7))) {
      return { recommendation: "No activity in the last week. Follow up with a call or email." };
    }

    if (
      lastActivity.subject?.toLowerCase().includes("call") &&
      lastActivity.metadata?.outcome === "Voicemail"
    ) {
      return { recommendation: "Last call was voicemail. Try calling again at a different time." };
    }

    if (lastActivity.subject?.toLowerCase().includes("meeting")) {
      return { recommendation: "Post-meeting follow-up: Send a summary email and next steps." };
    }

    return { recommendation: "Maintain momentum. Review the deal plan." };
  };
}
