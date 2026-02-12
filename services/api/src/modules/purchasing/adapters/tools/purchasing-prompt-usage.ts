import { type PromptRenderResult } from "@corely/prompts";
import { type PromptUsageLogger } from "../../../../shared/prompts/prompt-usage.logger";

export const logPurchasingPromptUsage = (params: {
  promptUsageLogger: PromptUsageLogger;
  prompt: Pick<PromptRenderResult, "promptId" | "promptVersion" | "promptHash">;
  modelId: string;
  tenantId: string;
  userId: string;
  runId?: string;
  toolName: string;
  purpose: string;
}): void => {
  params.promptUsageLogger.logUsage({
    promptId: params.prompt.promptId,
    promptVersion: params.prompt.promptVersion,
    promptHash: params.prompt.promptHash,
    modelId: params.modelId,
    provider: "anthropic",
    tenantId: params.tenantId,
    userId: params.userId,
    runId: params.runId,
    toolName: params.toolName,
    purpose: params.purpose,
  });
};
