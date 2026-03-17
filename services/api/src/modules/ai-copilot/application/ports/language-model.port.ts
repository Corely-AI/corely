import { type CopilotUIMessage } from "../../domain/types/ui-message";
import { type DomainToolPort } from "./domain-tool.port";
import { type ObservabilitySpanRef } from "@corely/kernel";
import { type WorkspaceKind } from "@corely/prompts";
import { type LanguageModelUsage, type StreamTextResult } from "ai";

export interface LanguageModelPort {
  streamChat(params: {
    messages: CopilotUIMessage[];
    tools: DomainToolPort[];
    locale?: string;
    runId: string;
    tenantId: string;
    toolTenantId?: string;
    workspaceId?: string;
    userId: string;
    workspaceKind?: WorkspaceKind;
    environment?: string;
    activeAppId?: string;
    observability: ObservabilitySpanRef;
  }): Promise<{ result: StreamTextResult<any, any>; usage?: LanguageModelUsage }>;
}
