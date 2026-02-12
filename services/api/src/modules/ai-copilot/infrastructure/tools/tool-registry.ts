import { Inject, Injectable, Optional } from "@nestjs/common";
import type { DomainToolPort } from "../../application/ports/domain-tool.port";
import { ToolRegistryPort, COPILOT_TOOLS } from "../../application/ports/tool-registry.port";
import {
  TENANT_ENTITLEMENTS_READ_PORT_TOKEN,
  type TenantEntitlementsReadPort,
} from "@corely/kernel";

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

  async listForTenant(tenantId: string): Promise<DomainToolPort[]> {
    const flatTools =
      Array.isArray(this.tools) && Array.isArray(this.tools[0])
        ? (this.tools as DomainToolPort[][]).flat()
        : (this.tools as DomainToolPort[]);

    if (!this.entitlementsRead) {
      return flatTools;
    }

    const appEnablement = await this.entitlementsRead
      .getAppEnablementMap(tenantId)
      .catch(() => null);
    if (!appEnablement) {
      return flatTools;
    }

    return flatTools.filter((tool) => {
      if (!tool.appId) {
        return true;
      }
      return appEnablement[tool.appId] === true;
    });
  }
}
