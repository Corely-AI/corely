import { Injectable } from "@nestjs/common";
import { z } from "zod";
import { DomainToolPort, ToolKind } from "../../../ai-copilot/application/ports/domain-tool.port";
import { GetDealByIdUseCase } from "../../application/use-cases/get-deal-by-id/get-deal-by-id.usecase";
import { GetTimelineUseCase } from "../../application/use-cases/get-timeline/get-timeline.usecase";
import { ok } from "@corely/kernel";

const InputSchema = z.object({
  dealId: z.string().describe("The ID of the deal to summarize"),
});

@Injectable()
export class GetDealSummaryTool implements DomainToolPort {
  name = "crm_get_deal_summary";
  description = "Get a summary of a deal including details and recent timeline events.";
  inputSchema = InputSchema;
  kind: ToolKind = "server";
  needsApproval = false;

  constructor(
    private readonly getDeal: GetDealByIdUseCase,
    private readonly getTimeline: GetTimelineUseCase
  ) {}

  execute = async (params: { tenantId: string; userId: string; input: unknown }) => {
    const { dealId } = InputSchema.parse(params.input);

    const dealResult = await this.getDeal.execute({ dealId }, { tenantId: params.tenantId });
    if (!dealResult.ok) {
      throw (dealResult as any).error;
    }

    const timelineResult = await this.getTimeline.execute(
      { entityType: "deal", entityId: dealId, limit: 5 },
      { tenantId: params.tenantId }
    );
    if (!timelineResult.ok) {
      throw (timelineResult as any).error;
    }

    return {
      deal: dealResult.value.deal,
      recentEvents: timelineResult.value.items,
    };
  };
}
