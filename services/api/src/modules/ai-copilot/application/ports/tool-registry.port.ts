import { type DomainToolPort } from "./domain-tool.port";

export interface ToolRegistryPort {
  listForTenant(
    tenantId: string,
    activeAppId?: string
  ): DomainToolPort[] | Promise<DomainToolPort[]>;
}

export const COPILOT_TOOLS = "ai-copilot/tools";
