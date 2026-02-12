export type AiTextRequest = {
  systemPrompt: string;
  userPrompt: string;
  temperature?: number;
  maxOutputTokens?: number;
};

export interface AiTextPort {
  generateText(request: AiTextRequest): Promise<string>;
}

export const AI_TEXT_PORT = "shared/ai-text-port";
