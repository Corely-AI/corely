import { z } from "zod";
import { generateObject } from "ai";
import { isErr, isOk } from "@corely/kernel";
import { ActivityProposalCardSchema } from "@corely/contracts";
import type { DomainToolPort } from "../../../ai-copilot/application/ports/domain-tool.port";
import { buildToolCtx, validationError } from "../../../ai-copilot/infrastructure/tools/tool-utils";
import {
  type CrmAiToolsContext,
  normalizeConfidence,
  renderFollowUpPrompt,
} from "./crm-tools.shared";

export const buildCrmFollowUpTools = (deps: CrmAiToolsContext): DomainToolPort[] => [
  {
    name: "crm_generateFollowUps",
    description:
      "Generate suggested follow-up activities (tasks, calls, emails) based on deal context and conversation history.",
    kind: "server",
    inputSchema: z.object({
      dealId: z.string().describe("The deal ID to generate follow-ups for"),
      context: z
        .string()
        .optional()
        .describe("Additional context (e.g., meeting notes, conversation summary)"),
    }),
    execute: async ({ tenantId, workspaceId, userId, input, toolCallId, runId }) => {
      const parsed = z
        .object({ dealId: z.string(), context: z.string().optional() })
        .safeParse(input);
      if (!parsed.success) {
        return validationError(parsed.error.flatten());
      }

      const { dealId, context } = parsed.data;

      const dealResult = await deps.crm.getDealById.execute(
        { dealId },
        buildToolCtx({ tenantId, workspaceId, userId, toolCallId, runId })
      );
      if (isErr(dealResult)) {
        return { ok: false, code: "DEAL_NOT_FOUND", message: "Deal not found" };
      }
      const deal = dealResult.value.deal;

      const activitiesResult = await deps.crm.listActivities.execute(
        { dealId, limit: 10 },
        buildToolCtx({ tenantId, workspaceId, userId, toolCallId, runId })
      );
      const existingActivities = isOk(activitiesResult) ? activitiesResult.value.items : [];
      const existingActivitiesList =
        existingActivities.length > 0
          ? existingActivities
              .map((activity) => `- ${activity.type}: ${activity.subject}`)
              .join("\n")
          : "- None";
      const contextSection = context
        ? `Recent Context:\n${context}`
        : "No additional context provided.";
      const amountText = deal.amountCents
        ? `EUR ${(deal.amountCents / 100).toFixed(2)}`
        : "Unknown";
      const prompt = renderFollowUpPrompt({
        deps,
        tenantId,
        userId,
        runId,
        toolName: "crm_generateFollowUps",
        variables: {
          DEAL_TITLE: deal.title,
          DEAL_STAGE: deal.stageId,
          DEAL_AMOUNT: amountText,
          DEAL_EXPECTED_CLOSE: deal.expectedCloseDate ?? "Unknown",
          DEAL_NOTES: deal.notes ?? "None",
          EXISTING_ACTIVITIES: existingActivitiesList,
          CONTEXT_SECTION: contextSection,
        },
      });

      const { object } = await generateObject({
        model: deps.defaultModel,
        schema: z.object({
          activities: z.array(
            z.object({
              type: z.enum(["NOTE", "TASK", "CALL", "MEETING", "COMMUNICATION"]),
              subject: z.string(),
              body: z.string().optional(),
              dueAt: z.string().optional().describe("ISO 8601 date-time"),
              priority: z.enum(["high", "medium", "low"]).optional(),
            })
          ),
          confidence: z.number(),
          rationale: z.string(),
        }),
        prompt: prompt.content,
      });
      const confidence = normalizeConfidence(object.confidence);

      return ActivityProposalCardSchema.parse({
        ok: true,
        proposals: object.activities.map((activity) => ({
          type: activity.type,
          subject: activity.subject,
          body: activity.body ?? null,
          partyId: deal.partyId,
          dealId: deal.id,
          dueAt: activity.dueAt ?? null,
          assignedToUserId: userId,
          metadata: {
            priority: activity.priority,
          },
        })),
        confidence,
        rationale: object.rationale,
        provenance: {
          dealId,
          context: context ?? null,
        },
      });
    },
  },
];
