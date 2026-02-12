import { Injectable } from "@nestjs/common";
import type { LanguageModel } from "ai";
import { generateText } from "ai";
import { openai } from "@ai-sdk/openai";
import { anthropic } from "@ai-sdk/anthropic";
import { EnvService } from "@corely/config";
import { ExternalServiceError } from "@corely/kernel";
import { type AiTextPort, type AiTextRequest } from "./ai-text.port";

@Injectable()
export class AiSdkTextAdapter implements AiTextPort {
  constructor(private readonly env: EnvService) {}

  async generateText(request: AiTextRequest): Promise<string> {
    const model = this.resolveModel();
    const result = await generateText({
      model,
      system: request.systemPrompt,
      prompt: request.userPrompt,
      temperature: request.temperature,
      maxOutputTokens: request.maxOutputTokens,
    });

    return result.text.trim();
  }

  private resolveModel(): LanguageModel {
    if (this.env.AI_MODEL_PROVIDER === "anthropic") {
      if (!this.env.ANTHROPIC_API_KEY) {
        throw new ExternalServiceError("Anthropic API key is not configured", {
          provider: "anthropic",
        });
      }
      return anthropic(this.env.AI_MODEL_ID) as unknown as LanguageModel;
    }

    if (!this.env.OPENAI_API_KEY) {
      throw new ExternalServiceError("OpenAI API key is not configured", {
        provider: "openai",
      });
    }

    return openai(this.env.AI_MODEL_ID) as unknown as LanguageModel;
  }
}
