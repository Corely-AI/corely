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
  ActivityAiExtractInputSchema,
  ActivityAiExtractOutputSchema,
  type ActivityAiActionItem,
  type ActivityAiExtractInput,
  type ActivityAiExtractOutput,
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
export class ExtractActivityAiUseCase extends BaseUseCase<
  ActivityAiExtractInput,
  ActivityAiExtractOutput
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

  protected validate(input: ActivityAiExtractInput): ActivityAiExtractInput {
    return ActivityAiExtractInputSchema.parse(input);
  }

  protected async handle(
    input: ActivityAiExtractInput,
    ctx: UseCaseContext
  ): Promise<Result<ActivityAiExtractOutput, UseCaseError>> {
    const workspaceId = resolveWorkspaceId(ctx.tenantId, ctx.workspaceId);
    await this.featureGate.assertEnabled(ctx.tenantId, workspaceId);
    const language = normalizeLanguage(input.workspaceLanguage);

    let result = this.fallbackExtract(input.notes);
    try {
      const promptContext = buildPromptContext({ env: this.env, tenantId: ctx.tenantId });
      const prompt = this.promptRegistry.render("crm.ai.activity_extract", promptContext, {
        LANGUAGE: language,
        NOTES_TEXT: input.notes,
      });
      const systemPrompt = this.promptRegistry.render(
        "crm.ai.system.activity_extract",
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
        purpose: "crm.ai.activity_extract",
      });
      const aiRaw = await this.aiText.generateText({
        systemPrompt: systemPrompt.content,
        userPrompt: prompt.content,
        temperature: 0.1,
        maxOutputTokens: 650,
      });
      result = ActivityAiExtractOutputSchema.shape.result.parse(parseAiJson(aiRaw));
    } catch {
      // Keep deterministic fallback result.
    }

    const followUpToolCards = result.actionItems.slice(0, 5).map((item) => ({
      toolCardType: "createActivity" as const,
      title: `Create follow-up: ${item.subject}`,
      confirmationLabel: "Create follow-up",
      payload: {
        type: item.suggestedType,
        subject: item.subject,
        body: item.details,
        dueAt: item.dueAt ?? undefined,
        dealId: undefined,
        partyId: undefined,
      },
      idempotencyKey: randomUUID(),
    }));

    return ok(ActivityAiExtractOutputSchema.parse({ result, followUpToolCards }));
  }

  private fallbackExtract(notes: string): ActivityAiExtractOutput["result"] {
    const lines = notes
      .split(/\n|\./)
      .map((line) => line.trim())
      .filter((line) => line.length > 0);
    const actionItems: ActivityAiActionItem[] = lines
      .filter((line) => /^(call|email|send|prepare|schedule|follow|update|check)\b/i.test(line))
      .slice(0, 5)
      .map((line) => ({
        subject: line.slice(0, 120),
        details: line,
        suggestedType: /call/i.test(line)
          ? "CALL"
          : /meeting|schedule/i.test(line)
            ? "MEETING"
            : "TASK",
        dueAt: undefined,
        confidence: 0.52,
      }));

    return {
      summary: lines.slice(0, 3).join(". ").slice(0, 400) || "No summary available.",
      actionItems,
      confidence: actionItems.length ? 0.54 : 0.42,
    };
  }
}
