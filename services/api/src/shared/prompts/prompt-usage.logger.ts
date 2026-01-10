import { Injectable, Logger } from "@nestjs/common";

export interface PromptUsagePayload {
  promptId: string;
  promptVersion: string;
  promptHash: string;
  modelId?: string;
  provider?: string;
  tenantId?: string;
  userId?: string;
  runId?: string;
  toolName?: string;
  purpose?: string;
}

@Injectable()
export class PromptUsageLogger {
  private readonly logger = new Logger("PromptUsage");

  logUsage(payload: PromptUsagePayload): void {
    this.logger.debug(JSON.stringify(payload));
  }
}
