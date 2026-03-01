import { randomUUID } from "node:crypto";
import { Inject, Injectable } from "@nestjs/common";
import {
  BaseUseCase,
  type LoggerPort,
  type Result,
  type UseCaseContext,
  type UseCaseError,
  RequireTenant,
  ValidationError,
  ok,
} from "@corely/kernel";
import {
  CommunicationAiSummarizeInputSchema,
  CommunicationAiSummarizeOutputSchema,
  IntentSentimentSchema,
  type ActivityAiExtractResult,
  type CommunicationAiSummarizeInput,
  type CommunicationAiSummarizeOutput,
} from "@corely/contracts";
import { PromptRegistry } from "@corely/prompts";
import { PromptUsageLogger } from "../../../../../shared/prompts/prompt-usage.logger";
import { buildPromptContext } from "../../../../../shared/prompts/prompt-context";
import { EnvService } from "@corely/config";
import { AI_TEXT_PORT, type AiTextPort } from "../../../../../shared/ai/ai-text.port";
import { CrmAiFeatureGateService } from "../../services/crm-ai-feature-gate.service";
import { normalizeLanguage, parseAiJson, resolveWorkspaceId } from "./crm-ai.shared";

@RequireTenant()
@Injectable()
export class SummarizeCommunicationAiUseCase extends BaseUseCase<
  CommunicationAiSummarizeInput,
  CommunicationAiSummarizeOutput
> {
  constructor(
    @Inject(AI_TEXT_PORT) private readonly aiText: AiTextPort,
    private readonly featureGate: CrmAiFeatureGateService,
    private readonly promptRegistry: PromptRegistry,
    private readonly promptUsageLogger: PromptUsageLogger,
    private readonly env: EnvService,
    logger: LoggerPort
  ) {
    super({ logger });
  }

  protected validate(input: CommunicationAiSummarizeInput): CommunicationAiSummarizeInput {
    return CommunicationAiSummarizeInputSchema.parse(input);
  }

  protected async handle(
    input: CommunicationAiSummarizeInput,
    ctx: UseCaseContext
  ): Promise<Result<CommunicationAiSummarizeOutput, UseCaseError>> {
    const workspaceId = resolveWorkspaceId(ctx.tenantId, ctx.workspaceId);
    const featureState = await this.featureGate.getState(ctx.tenantId, workspaceId);
    if (!featureState.aiEnabled) {
      throw new ValidationError("CRM AI is disabled for this workspace");
    }

    const language = normalizeLanguage(input.workspaceLanguage);
    const result = await this.extractSummary(input.body, ctx.tenantId, ctx.userId, language);
    const followUpToolCards = result.actionItems.slice(0, 5).map((item) => ({
      toolCardType: "createActivity" as const,
      title: `Create follow-up: ${item.subject}`,
      confirmationLabel: "Create follow-up",
      payload: {
        type: item.suggestedType,
        subject: item.subject,
        body: item.details,
        dealId: input.dealId,
        dueAt: item.dueAt ?? undefined,
      },
      idempotencyKey: randomUUID(),
    }));

    const shouldClassify = featureState.intentSentimentEnabled && input.direction === "INBOUND";
    const intentSentiment = shouldClassify
      ? await this.classifyIntent(input.body, ctx.tenantId, ctx.userId, language)
      : null;

    return ok(
      CommunicationAiSummarizeOutputSchema.parse({
        result,
        followUpToolCards,
        intentSentiment,
      })
    );
  }

  private async extractSummary(
    body: string,
    tenantId: string,
    userId: string | undefined,
    language: string
  ): Promise<ActivityAiExtractResult> {
    const fallback = this.fallbackSummary(body);
    try {
      const promptContext = buildPromptContext({ env: this.env, tenantId });
      const prompt = this.promptRegistry.render("crm.ai.communication_summarize", promptContext, {
        LANGUAGE: language,
        MESSAGE_BODY: body,
      });
      const systemPrompt = this.promptRegistry.render(
        "crm.ai.system.communication_summarize",
        promptContext,
        {}
      );
      this.promptUsageLogger.logUsage({
        promptId: prompt.promptId,
        promptVersion: prompt.promptVersion,
        promptHash: prompt.promptHash,
        modelId: this.env.AI_MODEL_ID,
        provider: this.env.AI_MODEL_PROVIDER,
        tenantId,
        userId,
        purpose: "crm.ai.communication_summarize",
      });

      const aiRaw = await this.aiText.generateText({
        systemPrompt: systemPrompt.content,
        userPrompt: prompt.content,
        temperature: 0.15,
        maxOutputTokens: 700,
      });
      return CommunicationAiSummarizeOutputSchema.shape.result.parse(parseAiJson(aiRaw));
    } catch {
      return fallback;
    }
  }

  private async classifyIntent(
    body: string,
    tenantId: string,
    userId: string | undefined,
    language: string
  ) {
    try {
      const promptContext = buildPromptContext({ env: this.env, tenantId });
      const prompt = this.promptRegistry.render("crm.ai.intent_sentiment", promptContext, {
        LANGUAGE: language,
        MESSAGE_BODY: body,
      });
      const systemPrompt = this.promptRegistry.render(
        "crm.ai.system.intent_sentiment",
        promptContext,
        {}
      );
      this.promptUsageLogger.logUsage({
        promptId: prompt.promptId,
        promptVersion: prompt.promptVersion,
        promptHash: prompt.promptHash,
        modelId: this.env.AI_MODEL_ID,
        provider: this.env.AI_MODEL_PROVIDER,
        tenantId,
        userId,
        purpose: "crm.ai.intent_sentiment",
      });
      const aiRaw = await this.aiText.generateText({
        systemPrompt: systemPrompt.content,
        userPrompt: prompt.content,
        temperature: 0.1,
        maxOutputTokens: 280,
      });
      return IntentSentimentSchema.parse(parseAiJson(aiRaw));
    } catch {
      return IntentSentimentSchema.parse({
        enabled: true,
        intentLabels: ["unknown"],
        sentiment: "neutral",
        confidence: 0.42,
      });
    }
  }

  private fallbackSummary(body: string): ActivityAiExtractResult {
    const lines = body
      .split(/\n|\./)
      .map((line) => line.trim())
      .filter((line) => line.length > 0);
    return {
      summary: lines.slice(0, 3).join(". ").slice(0, 400) || "No summary available.",
      actionItems: lines
        .filter((line) => /^(call|email|send|review|prepare|schedule|follow)\b/i.test(line))
        .slice(0, 5)
        .map((line) => ({
          subject: line.slice(0, 120),
          details: line,
          suggestedType: "TASK" as const,
          confidence: 0.5,
        })),
      confidence: 0.5,
    };
  }
}
