import { z } from "zod";
import { generateObject } from "ai";
import type { LanguageModel } from "ai";
import { anthropic } from "@ai-sdk/anthropic";
import type { EnvService } from "@corely/config";
import { type PromptRegistry } from "@corely/prompts";
import type { DomainToolPort } from "../../../ai-copilot/application/ports/domain-tool.port";
import { ApprovalPolicySuggestionCardSchema } from "@corely/contracts";
import { type PromptUsageLogger } from "../../../../shared/prompts/prompt-usage.logger";
import { buildPromptContext } from "../../../../shared/prompts/prompt-context";

const validationError = (issues: unknown) => ({
  ok: false,
  code: "VALIDATION_ERROR",
  message: "Invalid input for tool call",
  details: issues,
});

export const buildApprovalTools = (
  env: EnvService,
  promptRegistry: PromptRegistry,
  promptUsageLogger: PromptUsageLogger
): DomainToolPort[] => {
  const defaultModel = anthropic(env.AI_MODEL_ID) as unknown as LanguageModel;

  return [
    {
      name: "approvals_suggestPolicy",
      description: "Suggest an approval policy definition for a sensitive action.",
      kind: "server",
      inputSchema: z.object({
        actionKey: z.string(),
        description: z.string().optional(),
        samplePayload: z.record(z.unknown()).optional(),
      }),
      execute: async ({ tenantId, userId, input, runId }) => {
        const parsed = z
          .object({
            actionKey: z.string(),
            description: z.string().optional(),
            samplePayload: z.record(z.unknown()).optional(),
          })
          .safeParse(input);
        if (!parsed.success) {
          return validationError(parsed.error.flatten());
        }

        const { actionKey, description, samplePayload } = parsed.data;
        const prompt = promptRegistry.render(
          "approvals.suggest_policy",
          buildPromptContext({ env, tenantId }),
          {
            ACTION_KEY: actionKey,
            DESCRIPTION: description ?? "(none)",
            SAMPLE_PAYLOAD: samplePayload ? JSON.stringify(samplePayload) : "(none)",
          }
        );
        promptUsageLogger.logUsage({
          promptId: prompt.promptId,
          promptVersion: prompt.promptVersion,
          promptHash: prompt.promptHash,
          modelId: env.AI_MODEL_ID,
          provider: "anthropic",
          tenantId,
          userId,
          runId,
          toolName: "approvals_suggestPolicy",
          purpose: "approvals.suggest_policy",
        });

        const { object } = await generateObject({
          model: defaultModel,
          schema: z.object({
            name: z.string(),
            description: z.string().optional(),
            rules: z
              .object({
                all: z
                  .array(
                    z.object({
                      field: z.string(),
                      operator: z.enum([
                        "eq",
                        "neq",
                        "gt",
                        "gte",
                        "lt",
                        "lte",
                        "in",
                        "contains",
                        "exists",
                      ]),
                      value: z.unknown().optional(),
                    })
                  )
                  .optional(),
                any: z
                  .array(
                    z.object({
                      field: z.string(),
                      operator: z.enum([
                        "eq",
                        "neq",
                        "gt",
                        "gte",
                        "lt",
                        "lte",
                        "in",
                        "contains",
                        "exists",
                      ]),
                      value: z.unknown().optional(),
                    })
                  )
                  .optional(),
              })
              .optional(),
            steps: z.array(
              z.object({
                name: z.string(),
                assigneeRoleId: z.string().optional(),
                assigneeUserId: z.string().optional(),
                assigneePermissionKey: z.string().optional(),
                dueInHours: z.number().int().positive().optional(),
              })
            ),
            confidence: z.number().min(0).max(1),
            rationale: z.string(),
          }),
          prompt: prompt.content,
        });

        return ApprovalPolicySuggestionCardSchema.parse({
          ok: true,
          key: actionKey,
          name: object.name,
          description: object.description,
          rules: object.rules,
          steps: object.steps,
          confidence: object.confidence,
          rationale: object.rationale,
          provenance: { description, samplePayload },
        });
      },
    },
  ];
};
