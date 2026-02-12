import { type PromptUsageLogger } from "../../../../shared/prompts/prompt-usage.logger";

type RenderedPromptMeta = {
  promptId: string;
  promptVersion: number;
  promptHash: string;
};

export const logPurchasingPromptUsage = (params: {
  promptUsageLogger: PromptUsageLogger;
  prompt: RenderedPromptMeta;
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
