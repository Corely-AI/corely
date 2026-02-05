import type { WebsitePageBlueprint } from "@corely/contracts";

export interface WebsiteAiGeneratorPort {
  generatePageBlueprint(params: {
    tenantId?: string | null;
    userId?: string | null;
    pageType: string;
    locale: string;
    prompt: string;
    brandVoice?: string;
    suggestedPath?: string;
  }): Promise<{ blueprint: WebsitePageBlueprint; previewSummary: string }>;
}

export const WEBSITE_AI_PORT = "website/ai-generator-port";
