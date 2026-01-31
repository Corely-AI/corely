import { Injectable, Logger } from "@nestjs/common";
import { RichTextAiRequest, RichTextAiResponse } from "@corely/contracts";
import { RICH_TEXT_SYSTEM_PROMPT, buildRichTextUserPrompt } from "@corely/prompts";
import { generateText, streamText } from "ai";
import { openai } from "@ai-sdk/openai";
import { anthropic } from "@ai-sdk/anthropic";
import sanitizeHtml from "sanitize-html";

@Injectable()
export class RunRichTextAiUseCase {
  private readonly logger = new Logger(RunRichTextAiUseCase.name);

  private getModel() {
    const modelName = process.env.AI_MODEL_NAME || "gpt-4o";
    if (modelName.startsWith("claude")) {
      return anthropic(modelName);
    }
    return openai(modelName);
  }

  async executeBlocking(request: RichTextAiRequest): Promise<RichTextAiResponse> {
    const model = this.getModel();
    const contextSummary = this.getContextSummary(request);

    // Using generateText and forcing JSON mode via system prompt + parsing
    // This is safer if specific SDK version capabilities are unknown/flux
    const result = await generateText({
      model,
      system: RICH_TEXT_SYSTEM_PROMPT,
      prompt: buildRichTextUserPrompt(request, contextSummary),
      // If the SDK supports 'output: "json"', we could use that, but 'json' mode usually requires schema.
      // We'll rely on the prompt instructions for JSON.
    });

    let parsed: RichTextAiResponse;
    try {
      // Cleaning code block markers if present
      const cleanText = result.text
        .replace(/```json/g, "")
        .replace(/```/g, "")
        .trim();
      parsed = JSON.parse(cleanText);
    } catch (e) {
      this.logger.error("Failed to parse AI response", e);
      throw new Error("AI response was not valid JSON");
    }

    return this.sanitizeResponse(parsed, request);
  }

  async executeStream(request: RichTextAiRequest): Promise<any> {
    const model = this.getModel();
    const contextSummary = this.getContextSummary(request);

    return streamText({
      model,
      system: RICH_TEXT_SYSTEM_PROMPT,
      prompt: buildRichTextUserPrompt(request, contextSummary),
    });
  }

  private getContextSummary(request: RichTextAiRequest): string {
    if (!request.entityContext) {
      return "";
    }
    return `Module: ${request.entityContext.module}, Entity: ${request.entityContext.entityType}`;
  }

  private sanitizeResponse(
    response: RichTextAiResponse,
    request: RichTextAiRequest
  ): RichTextAiResponse {
    const cleanHtml = sanitizeHtml(response.html, {
      allowedTags: request.allowedTags,
      allowedAttributes: request.allowLinks ? { a: ["href"] } : {},
    });

    if (cleanHtml !== response.html) {
      if (!response.warnings) {
        response.warnings = [];
      }
      response.warnings.push("Some content was removed during security sanitization.");
      response.html = cleanHtml;
    }

    return response;
  }
}
