import { z } from "zod";
import { generateObject } from "ai";
import type { LanguageModel } from "ai";
import { isErr, isOk } from "@corely/kernel";
import { anthropic } from "@ai-sdk/anthropic";
import type { EnvService } from "@corely/config";
import { type PromptRegistry } from "@corely/prompts";
import type { DomainToolPort } from "../../../ai-copilot/application/ports/domain-tool.port";
import { buildToolCtx, validationError } from "../../../ai-copilot/infrastructure/tools/tool-utils";
import type { PartyApplication } from "../../../party/application/party.application";
import type { CrmApplication } from "../../application/crm.application";
import {
  PartyProposalSchema,
  PartyProposalCardSchema,
  DealProposalSchema,
  DealProposalCardSchema,
  ActivityProposalCardSchema,
} from "@corely/contracts";
import { type PromptUsageLogger } from "../../../../shared/prompts/prompt-usage.logger";
import { buildPromptContext } from "../../../../shared/prompts/prompt-context";

export const buildCrmAiTools = (deps: {
  party: PartyApplication;
  crm: CrmApplication;
  env: EnvService;
  promptRegistry: PromptRegistry;
  promptUsageLogger: PromptUsageLogger;
}): DomainToolPort[] => {
  const defaultModel = anthropic(deps.env.AI_MODEL_ID) as unknown as LanguageModel;

  return [
    // ============================================================
    // P0: Create Party from Text
    // ============================================================
    {
      name: "crm_createPartyFromText",
      description:
        "Extract party (customer/supplier/contact/employee) information from unstructured text (e.g., email signature, business card, message). Detects duplicates and returns a proposal with confidence score.",
      kind: "server",
      inputSchema: z.object({
        sourceText: z.string().describe("The unstructured text containing party information"),
        suggestedRoles: z
          .array(z.enum(["CUSTOMER", "SUPPLIER", "EMPLOYEE", "CONTACT"]))
          .optional()
          .describe("Optional role hints for the party"),
      }),
      execute: async ({ tenantId, workspaceId, userId, input, toolCallId, runId }) => {
        const parsed = z
          .object({ sourceText: z.string(), suggestedRoles: z.array(z.string()).optional() })
          .safeParse(input);
        if (!parsed.success) {
          return validationError(parsed.error.flatten());
        }

        const { sourceText, suggestedRoles } = parsed.data;
        const prompt = deps.promptRegistry.render(
          "crm.extract_party",
          buildPromptContext({ env: deps.env, tenantId }),
          {
            SOURCE_TEXT: sourceText,
            SUGGESTED_ROLES_LINE: suggestedRoles?.length
              ? `Suggested roles: ${suggestedRoles.join(", ")}`
              : "",
          }
        );
        deps.promptUsageLogger.logUsage({
          promptId: prompt.promptId,
          promptVersion: prompt.promptVersion,
          promptHash: prompt.promptHash,
          modelId: deps.env.AI_MODEL_ID,
          provider: "anthropic",
          tenantId,
          userId,
          runId,
          toolName: "crm_createPartyFromText",
          purpose: "crm.extract_party",
        });

        // Use LLM to extract structured party data
        const { object } = await generateObject({
          model: defaultModel,
          schema: z.object({
            displayName: z.string().describe("Full name or company name"),
            roles: z.array(z.enum(["CUSTOMER", "SUPPLIER", "EMPLOYEE", "CONTACT"])),
            email: z.string().email().optional(),
            phone: z.string().optional(),
            billingAddress: z
              .object({
                line1: z.string(),
                line2: z.string().optional(),
                city: z.string().optional(),
                postalCode: z.string().optional(),
                country: z.string().optional(),
              })
              .optional(),
            vatId: z.string().optional(),
            tags: z.array(z.string()).optional(),
            notes: z.string().optional(),
            confidence: z.number().min(0).max(1).describe("Confidence score 0.0-1.0"),
            rationale: z.string().describe("Brief explanation of extraction logic"),
          }),
          prompt: prompt.content,
        });

        // Search for potential duplicates
        const duplicates: Array<{
          id: string;
          displayName: string;
          email?: string;
          matchScore: number;
        }> = [];
        if (object.email) {
          const searchResult = await deps.party.searchCustomers.execute(
            { q: object.email, pageSize: 5 },
            buildToolCtx({ tenantId, workspaceId, userId, toolCallId, runId })
          );
          if (isOk(searchResult)) {
            duplicates.push(
              ...searchResult.value.items.map((customer) => ({
                id: customer.id,
                displayName: customer.displayName,
                email: customer.email ?? undefined,
                matchScore: 0.9,
              }))
            );
          }
        }

        const proposal = PartyProposalCardSchema.parse({
          ok: true,
          proposal: {
            displayName: object.displayName,
            roles: object.roles,
            email: object.email,
            phone: object.phone,
            billingAddress: object.billingAddress,
            vatId: object.vatId,
            tags: object.tags,
            notes: object.notes,
            duplicates,
          },
          confidence: object.confidence,
          rationale: object.rationale,
          provenance: {
            sourceText,
            extractedFields: Object.keys(object).filter(
              (k) => k !== "confidence" && k !== "rationale"
            ),
          },
        });

        return proposal;
      },
    },

    // ============================================================
    // P0: Create Deal from Text
    // ============================================================
    {
      name: "crm_createDealFromText",
      description:
        "Extract deal/opportunity information from text (e.g., meeting notes, email). Returns a proposal with confidence score.",
      kind: "server",
      inputSchema: z.object({
        sourceText: z.string().describe("The unstructured text containing deal information"),
        partyId: z.string().optional().describe("Optional party ID to associate the deal with"),
      }),
      execute: async ({ tenantId, workspaceId, userId, input, toolCallId, runId }) => {
        const parsed = z
          .object({ sourceText: z.string(), partyId: z.string().optional() })
          .safeParse(input);
        if (!parsed.success) {
          return validationError(parsed.error.flatten());
        }

        const { sourceText, partyId } = parsed.data;
        const prompt = deps.promptRegistry.render(
          "crm.extract_deal",
          buildPromptContext({ env: deps.env, tenantId }),
          {
            SOURCE_TEXT: sourceText,
            ASSOCIATED_PARTY_LINE: partyId ? `Associate with party ID: ${partyId}` : "",
          }
        );
        deps.promptUsageLogger.logUsage({
          promptId: prompt.promptId,
          promptVersion: prompt.promptVersion,
          promptHash: prompt.promptHash,
          modelId: deps.env.AI_MODEL_ID,
          provider: "anthropic",
          tenantId,
          userId,
          runId,
          toolName: "crm_createDealFromText",
          purpose: "crm.extract_deal",
        });

        // Use LLM to extract structured deal data
        const { object } = await generateObject({
          model: defaultModel,
          schema: z.object({
            title: z.string().describe("Deal title/name"),
            stageId: z
              .enum(["lead", "qualified", "proposal", "negotiation"])
              .describe("Pipeline stage")
              .default("lead"),
            amountCents: z.number().int().optional().describe("Deal value in cents"),
            currency: z.string().default("EUR"),
            expectedCloseDate: z.string().optional().describe("Expected close date (YYYY-MM-DD)"),
            probability: z.number().int().min(0).max(100).optional(),
            notes: z.string().optional(),
            tags: z.array(z.string()).optional(),
            confidence: z.number().min(0).max(1),
            rationale: z.string(),
          }),
          prompt: prompt.content,
        });

        const proposal = DealProposalCardSchema.parse({
          ok: true,
          proposal: {
            title: object.title,
            partyId: partyId ?? null,
            stageId: object.stageId,
            amountCents: object.amountCents ?? null,
            currency: object.currency,
            expectedCloseDate: object.expectedCloseDate ?? null,
            probability: object.probability ?? null,
            notes: object.notes ?? null,
            tags: object.tags ?? [],
          },
          confidence: object.confidence,
          rationale: object.rationale,
          provenance: {
            sourceText,
            extractedFields: Object.keys(object).filter(
              (k) => k !== "confidence" && k !== "rationale"
            ),
          },
        });

        return proposal;
      },
    },

    // ============================================================
    // P0: Generate Follow-up Activities
    // ============================================================
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

        // Fetch deal details
        const dealResult = await deps.crm.getDealById.execute(
          { dealId },
          buildToolCtx({ tenantId, workspaceId, userId, toolCallId, runId })
        );
        if (isErr(dealResult)) {
          return { ok: false, code: "DEAL_NOT_FOUND", message: "Deal not found" };
        }
        const deal = dealResult.value.deal;

        // Fetch existing activities for the deal
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
        const contextSection = parsed.data.context
          ? `Recent Context:\n${parsed.data.context}`
          : "No additional context provided.";
        const amountText = deal.amountCents
          ? `EUR ${(deal.amountCents / 100).toFixed(2)}`
          : "Unknown";
        const prompt = deps.promptRegistry.render(
          "crm.follow_up_suggestions",
          buildPromptContext({ env: deps.env, tenantId }),
          {
            DEAL_TITLE: deal.title,
            DEAL_STAGE: deal.stageId,
            DEAL_AMOUNT: amountText,
            DEAL_EXPECTED_CLOSE: deal.expectedCloseDate ?? "Unknown",
            DEAL_NOTES: deal.notes ?? "None",
            EXISTING_ACTIVITIES: existingActivitiesList,
            CONTEXT_SECTION: contextSection,
          }
        );
        deps.promptUsageLogger.logUsage({
          promptId: prompt.promptId,
          promptVersion: prompt.promptVersion,
          promptHash: prompt.promptHash,
          modelId: deps.env.AI_MODEL_ID,
          provider: "anthropic",
          tenantId,
          userId,
          runId,
          toolName: "crm_generateFollowUps",
          purpose: "crm.follow_up_suggestions",
        });

        // Use LLM to generate follow-up suggestions
        const { object } = await generateObject({
          model: defaultModel,
          schema: z.object({
            activities: z.array(
              z.object({
                type: z.enum(["NOTE", "TASK", "CALL", "MEETING", "EMAIL_DRAFT"]),
                subject: z.string(),
                body: z.string().optional(),
                dueAt: z.string().optional().describe("ISO 8601 date-time"),
                priority: z.enum(["high", "medium", "low"]).optional(),
              })
            ),
            confidence: z.number().min(0).max(1),
            rationale: z.string(),
          }),
          prompt: prompt.content,
        });

        const proposal = ActivityProposalCardSchema.parse({
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
          confidence: object.confidence,
          rationale: object.rationale,
          provenance: {
            dealId,
            context: context ?? null,
          },
        });

        return proposal;
      },
    },
  ];
};
