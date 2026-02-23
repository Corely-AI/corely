import { z } from "zod";
import { generateObject } from "ai";
import type { LanguageModel } from "ai";
import { isOk, type UseCaseError } from "@corely/kernel";
import { anthropic } from "@ai-sdk/anthropic";
import type { EnvService } from "@corely/config";
import { type PromptRegistry } from "@corely/prompts";
import type { PartyApplication } from "../../../party/application/party.application";
import type { CrmApplication } from "../../application/crm.application";
import { buildToolCtx } from "../../../ai-copilot/infrastructure/tools/tool-utils";
import { type PromptUsageLogger } from "../../../../shared/prompts/prompt-usage.logger";
import { buildPromptContext } from "../../../../shared/prompts/prompt-context";

export type CrmAiToolDeps = {
  party: PartyApplication;
  crm: CrmApplication;
  env: EnvService;
  promptRegistry: PromptRegistry;
  promptUsageLogger: PromptUsageLogger;
};

export type CrmAiToolsContext = CrmAiToolDeps & {
  defaultModel: LanguageModel;
};

export const buildCrmAiToolsContext = (deps: CrmAiToolDeps): CrmAiToolsContext => ({
  ...deps,
  defaultModel: anthropic(deps.env.AI_MODEL_ID) as unknown as LanguageModel,
});

export const partyExtractionSchema = z.object({
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
  confidence: z.number().describe("Confidence score 0.0-1.0"),
  rationale: z.string().describe("Brief explanation of extraction logic"),
});

export const dealExtractionSchema = z.object({
  title: z.string().describe("Deal title/name"),
  stageId: z
    .enum(["lead", "qualified", "proposal", "negotiation"])
    .describe("Pipeline stage")
    .default("lead"),
  amountCents: z.number().optional().describe("Deal value in cents"),
  currency: z.string().default("EUR"),
  expectedCloseDate: z.string().optional().describe("Expected close date (YYYY-MM-DD)"),
  probability: z.number().optional(),
  notes: z.string().optional(),
  tags: z.array(z.string()).optional(),
  confidence: z.number(),
  rationale: z.string(),
});

export const extractedFields = (object: Record<string, unknown>): string[] =>
  Object.keys(object).filter((key) => key !== "confidence" && key !== "rationale");

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

export const normalizeConfidence = (value: number): number => {
  if (!Number.isFinite(value)) {
    return 0.5;
  }

  return clamp(value, 0, 1);
};

export const normalizeDealNumericFields = <
  T extends {
    amountCents?: number;
    probability?: number;
  },
>(
  deal: T
): T => {
  const normalized = { ...deal };

  if (typeof normalized.amountCents === "number" && Number.isFinite(normalized.amountCents)) {
    normalized.amountCents = Math.round(normalized.amountCents);
  }

  if (typeof normalized.probability === "number" && Number.isFinite(normalized.probability)) {
    normalized.probability = Math.round(clamp(normalized.probability, 0, 100));
  }

  return normalized;
};

export const mapToolError = (error: UseCaseError) => ({
  ok: false,
  code: error.code,
  message: error.message,
  details: error.details,
});

const renderPrompt = (params: {
  deps: CrmAiToolsContext;
  tenantId: string;
  userId: string;
  runId?: string;
  toolName: string;
  promptId: string;
  variables: Record<string, string>;
}) => {
  const prompt = params.deps.promptRegistry.render(
    params.promptId,
    buildPromptContext({ env: params.deps.env, tenantId: params.tenantId }),
    params.variables
  );

  params.deps.promptUsageLogger.logUsage({
    promptId: prompt.promptId,
    promptVersion: prompt.promptVersion,
    promptHash: prompt.promptHash,
    modelId: params.deps.env.AI_MODEL_ID,
    provider: "anthropic",
    tenantId: params.tenantId,
    userId: params.userId,
    runId: params.runId,
    toolName: params.toolName,
    purpose: params.promptId,
  });

  return prompt;
};

export const extractPartyFromText = async (params: {
  deps: CrmAiToolsContext;
  tenantId: string;
  userId: string;
  runId?: string;
  toolName: string;
  sourceText: string;
  suggestedRolesLine?: string;
}) => {
  const prompt = renderPrompt({
    deps: params.deps,
    tenantId: params.tenantId,
    userId: params.userId,
    runId: params.runId,
    toolName: params.toolName,
    promptId: "crm.extract_party",
    variables: {
      SOURCE_TEXT: params.sourceText,
      SUGGESTED_ROLES_LINE: params.suggestedRolesLine ?? "",
    },
  });

  const { object } = await generateObject({
    model: params.deps.defaultModel,
    schema: partyExtractionSchema,
    prompt: prompt.content,
  });

  return object;
};

export const extractDealFromText = async (params: {
  deps: CrmAiToolsContext;
  tenantId: string;
  userId: string;
  runId?: string;
  toolName: string;
  sourceText: string;
  associatedPartyLine?: string;
}) => {
  const prompt = renderPrompt({
    deps: params.deps,
    tenantId: params.tenantId,
    userId: params.userId,
    runId: params.runId,
    toolName: params.toolName,
    promptId: "crm.extract_deal",
    variables: {
      SOURCE_TEXT: params.sourceText,
      ASSOCIATED_PARTY_LINE: params.associatedPartyLine ?? "",
    },
  });

  const { object } = await generateObject({
    model: params.deps.defaultModel,
    schema: dealExtractionSchema,
    prompt: prompt.content,
  });

  return object;
};

export const renderFollowUpPrompt = (params: {
  deps: CrmAiToolsContext;
  tenantId: string;
  userId: string;
  runId?: string;
  toolName: string;
  variables: {
    DEAL_TITLE: string;
    DEAL_STAGE: string;
    DEAL_AMOUNT: string;
    DEAL_EXPECTED_CLOSE: string;
    DEAL_NOTES: string;
    EXISTING_ACTIVITIES: string;
    CONTEXT_SECTION: string;
  };
}) =>
  renderPrompt({
    deps: params.deps,
    tenantId: params.tenantId,
    userId: params.userId,
    runId: params.runId,
    toolName: params.toolName,
    promptId: "crm.follow_up_suggestions",
    variables: params.variables,
  });

const normalize = (value?: string | null) => value?.trim().toLowerCase();

export const findCustomerDuplicates = async (params: {
  deps: CrmAiToolsContext;
  tenantId: string;
  workspaceId?: string;
  userId: string;
  toolCallId?: string;
  runId?: string;
  email?: string;
  displayName?: string;
  pageSize?: number;
}): Promise<
  Array<{
    id: string;
    displayName: string;
    email?: string;
    matchScore: number;
  }>
> => {
  const matches = new Map<
    string,
    {
      id: string;
      displayName: string;
      email?: string;
      matchScore: number;
    }
  >();
  const toolCtx = buildToolCtx({
    tenantId: params.tenantId,
    workspaceId: params.workspaceId,
    userId: params.userId,
    toolCallId: params.toolCallId,
    runId: params.runId,
  });

  const emailQuery = params.email?.trim();
  if (emailQuery) {
    const emailResult = await params.deps.party.searchCustomers.execute(
      { q: emailQuery, pageSize: params.pageSize ?? 5 },
      toolCtx
    );
    if (isOk(emailResult)) {
      const normalizedEmail = normalize(emailQuery);
      for (const customer of emailResult.value.items) {
        const score = normalize(customer.email) === normalizedEmail ? 0.95 : 0.8;
        const existing = matches.get(customer.id);
        if (!existing || existing.matchScore < score) {
          matches.set(customer.id, {
            id: customer.id,
            displayName: customer.displayName,
            email: customer.email ?? undefined,
            matchScore: score,
          });
        }
      }
    }
  }

  const nameQuery = params.displayName?.trim();
  if (nameQuery) {
    const nameResult = await params.deps.party.searchCustomers.execute(
      { q: nameQuery, pageSize: params.pageSize ?? 5 },
      toolCtx
    );
    if (isOk(nameResult)) {
      const normalizedName = normalize(nameQuery);
      for (const customer of nameResult.value.items) {
        const score = normalize(customer.displayName) === normalizedName ? 0.9 : 0.7;
        const existing = matches.get(customer.id);
        if (!existing || existing.matchScore < score) {
          matches.set(customer.id, {
            id: customer.id,
            displayName: customer.displayName,
            email: customer.email ?? undefined,
            matchScore: score,
          });
        }
      }
    }
  }

  return [...matches.values()].sort((a, b) => b.matchScore - a.matchScore);
};
