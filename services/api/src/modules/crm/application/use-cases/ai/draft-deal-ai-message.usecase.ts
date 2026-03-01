import { Inject, Injectable } from "@nestjs/common";
import {
  BaseUseCase,
  ExternalServiceError,
  type LoggerPort,
  type Result,
  type UseCaseContext,
  type UseCaseError,
  ValidationError,
  RequireTenant,
  ok,
  err,
} from "@corely/kernel";
import {
  CrmMessageDraftSchema,
  DraftDealMessageInputSchema,
  DraftDealMessageOutputSchema,
  type DraftDealMessageInput,
  type DraftDealMessageOutput,
} from "@corely/contracts";
import { PromptRegistry } from "@corely/prompts";
import { PromptUsageLogger } from "../../../../../shared/prompts/prompt-usage.logger";
import { buildPromptContext } from "../../../../../shared/prompts/prompt-context";
import { EnvService } from "@corely/config";
import { AI_TEXT_PORT, type AiTextPort } from "../../../../../shared/ai/ai-text.port";
import { DealAiAnalyticsService } from "../../services/deal-ai-analytics.service";
import { CrmAiFeatureGateService } from "../../services/crm-ai-feature-gate.service";
import {
  buildTimelineContext,
  normalizeLanguage,
  parseAiJson,
  resolveWorkspaceId,
} from "./crm-ai.shared";

type DraftDealAiMessageUseCaseInput = DraftDealMessageInput & {
  dealId: string;
};

@RequireTenant()
@Injectable()
export class DraftDealAiMessageUseCase extends BaseUseCase<
  DraftDealAiMessageUseCaseInput,
  DraftDealMessageOutput
> {
  constructor(
    @Inject(AI_TEXT_PORT) private readonly aiText: AiTextPort,
    private readonly analytics: DealAiAnalyticsService,
    private readonly featureGate: CrmAiFeatureGateService,
    private readonly promptRegistry: PromptRegistry,
    private readonly promptUsageLogger: PromptUsageLogger,
    private readonly env: EnvService,
    logger: LoggerPort
  ) {
    super({ logger });
  }

  protected validate(input: DraftDealAiMessageUseCaseInput): DraftDealAiMessageUseCaseInput {
    DraftDealMessageInputSchema.parse(input);
    if (!input.dealId || !input.dealId.trim()) {
      throw new ValidationError("dealId is required");
    }
    return input;
  }

  protected async handle(
    input: DraftDealAiMessageUseCaseInput,
    ctx: UseCaseContext
  ): Promise<Result<DraftDealMessageOutput, UseCaseError>> {
    const workspaceId = resolveWorkspaceId(ctx.tenantId, ctx.workspaceId);
    await this.featureGate.assertEnabled(ctx.tenantId, workspaceId);

    const healthContext = await this.analytics.buildHealthContext(
      ctx.tenantId,
      input.dealId,
      new Date()
    );
    const language = normalizeLanguage(
      input.translateToWorkspaceLanguage ? input.workspaceLanguage : undefined
    );

    try {
      const promptContext = buildPromptContext({ env: this.env, tenantId: ctx.tenantId });
      const prompt = this.promptRegistry.render("crm.ai.deal_message_draft", promptContext, {
        CHANNEL: input.channel,
        LANGUAGE: language,
        PERSONALIZE_WITH_TIMELINE: input.personalizeWithTimeline ? "true" : "false",
        DEAL_JSON: JSON.stringify(
          {
            title: healthContext.deal.title,
            stageId: healthContext.deal.stageId,
            amountCents: healthContext.deal.amountCents,
            currency: healthContext.deal.currency,
            expectedCloseDate: healthContext.deal.expectedCloseDate,
            notes: healthContext.deal.notes,
          },
          null,
          2
        ),
        TIMELINE_CONTEXT: buildTimelineContext(healthContext.timelineItems, 16),
      });
      const systemPrompt = this.promptRegistry.render(
        "crm.ai.system.deal_message_draft",
        promptContext,
        {}
      );

      this.promptUsageLogger.logUsage({
        promptId: prompt.promptId,
        promptVersion: prompt.promptVersion,
        promptHash: prompt.promptHash,
        modelId: this.env.AI_MODEL_ID,
        provider: this.env.AI_MODEL_PROVIDER,
        tenantId: ctx.tenantId,
        userId: ctx.userId,
        purpose: "crm.ai.deal_message_draft",
      });

      const aiRaw = await this.aiText.generateText({
        systemPrompt: systemPrompt.content,
        userPrompt: prompt.content,
        temperature: 0.25,
        maxOutputTokens: 850,
      });

      const payload = parseAiJson(aiRaw);
      const draft = CrmMessageDraftSchema.parse(payload);
      const output = DraftDealMessageOutputSchema.parse({ draft });
      return ok(output);
    } catch (cause) {
      if (cause instanceof ValidationError) {
        return err(cause);
      }

      const fallbackDraft = this.buildFallbackDraft({
        channel: input.channel,
        language,
        dealTitle: healthContext.deal.title,
        personalizeWithTimeline: input.personalizeWithTimeline,
        translateToWorkspaceLanguage: input.translateToWorkspaceLanguage,
      });
      return ok({ draft: fallbackDraft });
    }
  }

  private buildFallbackDraft(params: {
    channel: string;
    language: string;
    dealTitle: string;
    personalizeWithTimeline: boolean;
    translateToWorkspaceLanguage: boolean;
  }) {
    return CrmMessageDraftSchema.parse({
      channel: params.channel,
      language: params.language,
      variants: [
        {
          style: "short",
          subject: `Follow-up: ${params.dealTitle}`,
          body: `Hi {{contact_first_name}}, quick follow-up on ${params.dealTitle}.`,
        },
        {
          style: "normal",
          subject: `Next steps for ${params.dealTitle}`,
          body: [
            "Hi {{contact_first_name}},",
            "",
            `I wanted to follow up on ${params.dealTitle} and align the next steps.`,
            "Are you available for a short check-in this week?",
            "",
            "Best regards,",
            "{{sender_name}}",
          ].join("\n"),
        },
        {
          style: "assertive",
          subject: `Decision checkpoint: ${params.dealTitle}`,
          body: [
            "Hi {{contact_first_name}},",
            "",
            "To keep momentum, please confirm the remaining decision points.",
            "If needed, propose a specific time to finalize this week.",
            "",
            "Regards,",
            "{{sender_name}}",
          ].join("\n"),
        },
      ],
      personalizeWithTimeline: params.personalizeWithTimeline,
      translateToWorkspaceLanguage: params.translateToWorkspaceLanguage,
      placeholdersUsed: [
        { key: "contact_first_name", value: null, fallback: "there" },
        { key: "sender_name", value: null, fallback: "the team" },
      ],
    });
  }
}
