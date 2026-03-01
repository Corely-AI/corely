import { Inject, Injectable } from "@nestjs/common";
import { EnvService } from "@corely/config";
import {
  BaseUseCase,
  RequireTenant,
  ValidationError,
  type LoggerPort,
  type Result,
  type UseCaseContext,
  type UseCaseError,
  ok,
  err,
} from "@corely/kernel";
import {
  GenerateChannelTemplateAiInputSchema,
  GenerateChannelTemplateAiOutputSchema,
  type GenerateChannelTemplateAiInput,
  type GenerateChannelTemplateAiOutput,
} from "@corely/contracts";
import { PromptRegistry } from "@corely/prompts";
import { z } from "zod";
import { PromptUsageLogger } from "../../../../../shared/prompts/prompt-usage.logger";
import { buildPromptContext } from "../../../../../shared/prompts/prompt-context";
import { AI_TEXT_PORT, type AiTextPort } from "../../../../../shared/ai/ai-text.port";
import { CrmAiFeatureGateService } from "../../services/crm-ai-feature-gate.service";
import { normalizeLanguage, parseAiJson } from "./crm-ai.shared";

const GeneratedChannelTemplateSchema = z.object({
  subject: z.string().trim().min(1).nullable().optional(),
  body: z.string().trim().min(1),
});

@RequireTenant()
@Injectable()
export class GenerateChannelTemplateAiUseCase extends BaseUseCase<
  GenerateChannelTemplateAiInput,
  GenerateChannelTemplateAiOutput
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

  protected validate(input: GenerateChannelTemplateAiInput): GenerateChannelTemplateAiInput {
    GenerateChannelTemplateAiInputSchema.parse(input);

    return {
      ...input,
      workspaceId: input.workspaceId.trim(),
      context: input.context?.trim() || undefined,
    };
  }

  protected async handle(
    input: GenerateChannelTemplateAiInput,
    ctx: UseCaseContext
  ): Promise<Result<GenerateChannelTemplateAiOutput, UseCaseError>> {
    if (ctx.workspaceId && ctx.workspaceId !== input.workspaceId) {
      throw new ValidationError("workspaceId must match active workspace context");
    }

    await this.featureGate.assertEnabled(ctx.tenantId, input.workspaceId);

    const isEmail = input.channel === "email";
    const language = normalizeLanguage(input.workspaceLanguage);
    const contextText = input.context?.trim() || "No additional context provided.";

    try {
      const promptContext = buildPromptContext({ env: this.env, tenantId: ctx.tenantId });
      const prompt = this.promptRegistry.render("crm.ai.channel_template_generate", promptContext, {
        CHANNEL: input.channel,
        LANGUAGE: language,
        IS_EMAIL: isEmail ? "true" : "false",
        CONTEXT: contextText,
      });
      const systemPrompt = this.promptRegistry.render(
        "crm.ai.system.channel_template_generate",
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
        purpose: "crm.ai.channel_template_generate",
      });

      const aiRaw = await this.aiText.generateText({
        systemPrompt: systemPrompt.content,
        userPrompt: prompt.content,
        temperature: 0.25,
        maxOutputTokens: 500,
      });

      const payload = parseAiJson(aiRaw);
      const generated = GeneratedChannelTemplateSchema.parse(payload);

      const output = GenerateChannelTemplateAiOutputSchema.parse({
        subject: isEmail ? generated.subject?.trim() || "Quick follow-up" : null,
        body: generated.body.trim(),
      });
      return ok(output);
    } catch (cause) {
      if (cause instanceof ValidationError) {
        return err(cause);
      }

      const fallback = this.buildFallbackTemplate(isEmail);
      return ok(fallback);
    }
  }

  private buildFallbackTemplate(isEmail: boolean): GenerateChannelTemplateAiOutput {
    if (isEmail) {
      return {
        subject: "Quick follow-up",
        body: [
          "Hi {firstName},",
          "",
          "I wanted to quickly follow up on {dealTitle}.",
          "Would you be available for a short check-in this week?",
          "",
          "Best regards,",
        ].join("\n"),
      };
    }

    return {
      subject: null,
      body: "Hi {firstName}, quick follow-up on {dealTitle}. Are you available for a short check-in this week?",
    };
  }
}
