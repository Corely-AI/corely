import { generateObject } from "ai";
import type { LanguageModel } from "ai";
import { openai } from "@ai-sdk/openai";
import { anthropic } from "@ai-sdk/anthropic";
import type { EnvService } from "@corely/config";
import type { PromptRegistry } from "@corely/prompts";
import { type PromptUsageLogger } from "@/shared/prompts/prompt-usage.logger";
import { buildPromptContext } from "@/shared/prompts/prompt-context";
import { WebsitePageBlueprintSchema, type WebsitePageBlueprint } from "@corely/contracts";
import type { WebsiteAiGeneratorPort } from "../../application/ports/website-ai.port";

export class AiSdkWebsitePageGenerator implements WebsiteAiGeneratorPort {
  constructor(
    private readonly env: EnvService,
    private readonly promptRegistry: PromptRegistry,
    private readonly promptUsageLogger: PromptUsageLogger
  ) {}

  async generatePageBlueprint(params: {
    tenantId?: string | null;
    userId?: string | null;
    pageType: string;
    locale: string;
    prompt: string;
    brandVoice?: string;
    suggestedPath?: string;
  }): Promise<{ blueprint: WebsitePageBlueprint; previewSummary: string }> {
    const tenantId = params.tenantId ?? "system";
    const prompt = this.promptRegistry.render(
      "website.generate_page",
      buildPromptContext({ env: this.env, tenantId }),
      {
        PAGE_TYPE: params.pageType,
        LOCALE: params.locale,
        BRAND_VOICE: params.brandVoice ?? "neutral",
        SUGGESTED_PATH: params.suggestedPath ?? "auto",
        PROMPT: params.prompt,
      }
    );

    this.promptUsageLogger.logUsage({
      promptId: prompt.promptId,
      promptVersion: prompt.promptVersion,
      promptHash: prompt.promptHash,
      modelId: this.env.AI_MODEL_ID,
      provider: this.env.AI_MODEL_PROVIDER,
      tenantId,
      userId: params.userId ?? undefined,
      purpose: "website.generate_page",
    });

    const model = this.resolveModel(this.env);

    const { object } = await generateObject({
      model,
      schema: WebsitePageBlueprintSchema,
      prompt: prompt.content,
    });

    const blueprint = WebsitePageBlueprintSchema.parse(object);
    const previewSummary = `${blueprint.title} — ${blueprint.excerpt}`;

    return { blueprint, previewSummary };
  }

  private resolveModel(env: EnvService): LanguageModel {
    const modelId = env.AI_MODEL_ID;
    return env.AI_MODEL_PROVIDER === "anthropic"
      ? (anthropic(modelId) as unknown as LanguageModel)
      : (openai(modelId) as unknown as LanguageModel);
  }
}
