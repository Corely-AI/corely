import { Inject, Injectable } from "@nestjs/common";
import {
  BaseUseCase,
  isOk,
  type LoggerPort,
  type Result,
  type UseCaseContext,
  type UseCaseError,
  RequireTenant,
  ValidationError,
  ok,
} from "@corely/kernel";
import {
  ActivityAiParseInputSchema,
  ActivityAiParseOutputSchema,
  type ActivityAiLinkSuggestion,
  type ActivityAiParseInput,
  type ActivityAiParseOutput,
} from "@corely/contracts";
import { PromptRegistry } from "@corely/prompts";
import { PromptUsageLogger } from "../../../../../shared/prompts/prompt-usage.logger";
import { buildPromptContext } from "../../../../../shared/prompts/prompt-context";
import { EnvService } from "@corely/config";
import { AI_TEXT_PORT, type AiTextPort } from "../../../../../shared/ai/ai-text.port";
import { DEAL_REPO_PORT, type DealRepoPort } from "../../ports/deal-repository.port";
import { CrmAiFeatureGateService } from "../../services/crm-ai-feature-gate.service";
import { PartyApplication } from "../../../../party/application/party.application";
import { normalizeLanguage, parseAiJson, resolveWorkspaceId } from "./crm-ai.shared";

@RequireTenant()
@Injectable()
export class ParseActivityAiUseCase extends BaseUseCase<
  ActivityAiParseInput,
  ActivityAiParseOutput
> {
  constructor(
    @Inject(AI_TEXT_PORT) private readonly aiText: AiTextPort,
    @Inject(DEAL_REPO_PORT) private readonly dealRepo: DealRepoPort,
    private readonly partyApp: PartyApplication,
    private readonly featureGate: CrmAiFeatureGateService,
    private readonly promptRegistry: PromptRegistry,
    private readonly promptUsageLogger: PromptUsageLogger,
    private readonly env: EnvService,
    logger: LoggerPort
  ) {
    super({ logger });
  }

  protected validate(input: ActivityAiParseInput): ActivityAiParseInput {
    return ActivityAiParseInputSchema.parse(input);
  }

  protected async handle(
    input: ActivityAiParseInput,
    ctx: UseCaseContext
  ): Promise<Result<ActivityAiParseOutput, UseCaseError>> {
    const workspaceId = resolveWorkspaceId(ctx.tenantId, ctx.workspaceId);
    await this.featureGate.assertEnabled(ctx.tenantId, workspaceId);

    const language = normalizeLanguage(input.workspaceLanguage);
    const fallback = this.fallbackParse(input.description);
    const [suggestedDeals, suggestedContacts] = await Promise.all([
      this.suggestDeals(ctx.tenantId, input.description),
      this.suggestContacts(input.description, ctx),
    ]);

    try {
      const prompt = this.promptRegistry.render(
        "crm.ai.activity_parse",
        buildPromptContext({ env: this.env, tenantId: ctx.tenantId }),
        {
          LANGUAGE: language,
          USER_TEXT: input.description,
        }
      );
      this.promptUsageLogger.logUsage({
        promptId: prompt.promptId,
        promptVersion: prompt.promptVersion,
        promptHash: prompt.promptHash,
        modelId: this.env.AI_MODEL_ID,
        provider: this.env.AI_MODEL_PROVIDER,
        tenantId: ctx.tenantId,
        userId: ctx.userId,
        purpose: "crm.ai.activity_parse",
      });

      const aiRaw = await this.aiText.generateText({
        systemPrompt: "Parse CRM activity descriptions. Return strict JSON only.",
        userPrompt: prompt.content,
        temperature: 0.1,
        maxOutputTokens: 500,
      });
      const parsed = parseAiJson(aiRaw);
      const result = ActivityAiParseOutputSchema.shape.result.parse({
        ...fallback,
        ...parsed,
        suggestedDeals,
        suggestedContacts,
      });

      const applyToolCard = result.subject
        ? {
            toolCardType: "createActivity" as const,
            title: "Apply parsed activity",
            confirmationLabel: "Apply fields",
            payload: this.toCreateActivityPayload(result),
          }
        : undefined;

      return ok(ActivityAiParseOutputSchema.parse({ result, applyToolCard }));
    } catch {
      const result = ActivityAiParseOutputSchema.shape.result.parse({
        ...fallback,
        suggestedDeals,
        suggestedContacts,
      });
      return ok(
        ActivityAiParseOutputSchema.parse({
          result,
          applyToolCard:
            result.subject && result.activityType
              ? {
                  toolCardType: "createActivity",
                  title: "Apply parsed activity",
                  confirmationLabel: "Apply fields",
                  payload: this.toCreateActivityPayload(result),
                }
              : undefined,
        })
      );
    }
  }

  private fallbackParse(description: string): ActivityAiParseOutput["result"] {
    const normalized = description.toLowerCase();
    const activityType = normalized.includes("call")
      ? "CALL"
      : normalized.includes("meeting")
        ? "MEETING"
        : normalized.includes("email") || normalized.includes("message")
          ? "COMMUNICATION"
          : "TASK";

    const subject = description.split(".")[0]?.trim().slice(0, 120) || "Follow up";
    const dueAt = this.detectDueAt(normalized);

    return {
      activityType,
      subject,
      dueAt,
      notesTemplate: description,
      suggestedDeals: [],
      suggestedContacts: [],
      confidence: 0.48,
    };
  }

  private detectDueAt(text: string): string | null {
    const now = new Date();
    if (text.includes("tomorrow")) {
      const date = new Date(now.getTime() + 24 * 60 * 60 * 1000);
      const timeMatch = text.match(/\b(\d{1,2}):(\d{2})\b/);
      if (timeMatch) {
        date.setHours(Number(timeMatch[1]), Number(timeMatch[2]), 0, 0);
      } else {
        date.setHours(10, 0, 0, 0);
      }
      return date.toISOString();
    }
    return null;
  }

  private async suggestDeals(tenantId: string, text: string): Promise<ActivityAiLinkSuggestion[]> {
    const page = await this.dealRepo.list(tenantId, {}, 25);
    const normalized = text.toLowerCase();
    return page.items
      .map((deal) => {
        const score =
          deal.title.toLowerCase().includes(normalized) ||
          normalized.includes(deal.title.toLowerCase())
            ? 0.82
            : this.partialScore(normalized, deal.title.toLowerCase());
        return {
          id: deal.id,
          label: deal.title,
          score,
          reason: score > 0.5 ? "Title matches the described activity context." : undefined,
        };
      })
      .filter((item) => item.score > 0.35)
      .sort((a, b) => b.score - a.score)
      .slice(0, 5);
  }

  private async suggestContacts(
    text: string,
    ctx: UseCaseContext
  ): Promise<ActivityAiLinkSuggestion[]> {
    const result = await this.partyApp.searchCustomers.execute(
      {
        q: text,
        pageSize: 5,
      },
      ctx
    );
    if (!isOk(result)) {
      return [];
    }
    return result.value.items.map((item) => ({
      id: item.id,
      label: item.displayName,
      score: 0.6,
      reason: "Name/email appears related to the activity description.",
    }));
  }

  private partialScore(text: string, candidate: string): number {
    const tokens = text
      .split(/\s+/)
      .map((token) => token.trim())
      .filter((token) => token.length >= 3);
    if (!tokens.length) {
      return 0;
    }
    const matches = tokens.filter((token) => candidate.includes(token)).length;
    return matches / tokens.length;
  }

  private toCreateActivityPayload(result: ActivityAiParseOutput["result"]) {
    const base = {
      subject: result.subject ?? "Follow up",
      body: result.notesTemplate,
      dealId: result.suggestedDeals[0]?.id,
      partyId: result.suggestedContacts[0]?.id,
      dueAt: result.dueAt ?? undefined,
    };
    if (result.activityType === "COMMUNICATION") {
      return {
        ...base,
        type: "COMMUNICATION" as const,
        channelKey: "email",
        direction: "OUTBOUND" as const,
        communicationStatus: "DRAFT" as const,
      };
    }
    return {
      ...base,
      type: result.activityType ?? "TASK",
    };
  }
}
