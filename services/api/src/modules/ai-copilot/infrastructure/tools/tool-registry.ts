import { Inject, Injectable, Optional } from "@nestjs/common";
import type { DomainToolPort } from "../../application/ports/domain-tool.port";
import { ToolRegistryPort, COPILOT_TOOLS } from "../../application/ports/tool-registry.port";
import {
  TENANT_ENTITLEMENTS_READ_PORT_TOKEN,
  type TenantEntitlementsReadPort,
} from "@corely/kernel";
import { isToolInActiveAppScope } from "./app-scope";

@Injectable()
export class ToolRegistry implements ToolRegistryPort {
  constructor(
    @Optional()
    @Inject(COPILOT_TOOLS)
    private readonly tools: DomainToolPort[] | DomainToolPort[][] = [],
    @Optional()
    @Inject(TENANT_ENTITLEMENTS_READ_PORT_TOKEN)
    private readonly entitlementsRead?: TenantEntitlementsReadPort
  ) {}

  async listForTenant(tenantId: string, activeAppId?: string): Promise<DomainToolPort[]> {
    const flatTools =
      Array.isArray(this.tools) && Array.isArray(this.tools[0])
        ? (this.tools as DomainToolPort[][]).flat()
        : (this.tools as DomainToolPort[]);

    let availableTools = flatTools;

    if (this.entitlementsRead) {
      const appEnablement = await this.entitlementsRead
        .getAppEnablementMap(tenantId)
        .catch(() => null);

      if (appEnablement) {
        availableTools = availableTools.filter((tool) => {
          if (!tool.appId || tool.appId === "common") {
            return true;
          }
          return appEnablement[tool.appId] === true;
        });
      }
    }

    if (activeAppId) {
      availableTools = availableTools.filter((tool) =>
        isToolInActiveAppScope(tool.appId, activeAppId)
      );
    }

    return availableTools;
  }
}
