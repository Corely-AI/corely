import { CopilotUIMessage } from "../../domain/types/ui-message";
import { DomainToolPort } from "./domain-tool.port";
import { Response } from "express";

export interface LanguageModelPort {
  streamChat(params: {
    messages: CopilotUIMessage[];
    tools: DomainToolPort[];
    runId: string;
    tenantId: string;
    userId: string;
    response: Response;
  }): Promise<void>;
}
