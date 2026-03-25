import { type SurfaceId } from "@corely/contracts";
import { type DomainToolPort } from "./domain-tool.port";

export interface ToolRegistryPort {
  listForTenant(
    tenantId: string,
    activeAppId?: string,
    surfaceId?: SurfaceId
  ): DomainToolPort[] | Promise<DomainToolPort[]>;
}

export const COPILOT_TOOLS = "ai-copilot/tools";
