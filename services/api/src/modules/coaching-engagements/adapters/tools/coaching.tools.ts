import { GetCoachingArtifactSummaryInputSchema } from "@corely/contracts";
import type { DomainToolPort } from "../../../ai-copilot/application/ports/domain-tool.port";
import { buildToolCtx, validationError } from "../../../ai-copilot/infrastructure/tools/tool-utils";
import { mapToolResult } from "../../../../shared/adapters/tools/tool-mappers";
import { type CoachingEngagementsApplication } from "../../application/coaching-engagements.application";

export const buildCoachingTools = (app: CoachingEngagementsApplication): DomainToolPort[] => [
  {
    name: "coaching_engagement_summary",
    description:
      "Retrieve an authorization-checked summary of coaching artifacts for a specific engagement.",
    kind: "server",
    inputSchema: GetCoachingArtifactSummaryInputSchema,
    execute: async ({ tenantId, workspaceId, userId, input, toolCallId, runId }) => {
      const parsed = GetCoachingArtifactSummaryInputSchema.safeParse(input);
      if (!parsed.success) {
        return validationError(parsed.error.flatten());
      }
      const result = await app.getArtifactSummary.execute(
        parsed.data,
        buildToolCtx({ tenantId, workspaceId, userId, toolCallId, runId })
      );
      return mapToolResult(result);
    },
  },
];
