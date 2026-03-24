import { Inject, Injectable, Optional } from "@nestjs/common";
import { isSurfaceAllowed, type SurfaceId } from "@corely/contracts";
import type { DomainToolPort } from "../../application/ports/domain-tool.port";
import { ToolRegistryPort, COPILOT_TOOLS } from "../../application/ports/tool-registry.port";
import {
  TENANT_ENTITLEMENTS_READ_PORT_TOKEN,
  type TenantEntitlementsReadPort,
} from "@corely/kernel";
import { isFreelancerScopedContext, isToolInActiveAppScope } from "./app-scope";

const APP_DEFAULT_SURFACES: Record<string, SurfaceId[]> = {
  crm: ["platform", "crm"],
  restaurant: ["platform", "pos"],
  "cash-management": ["platform", "pos"],
};

const resolveAllowedSurfaces = (tool: DomainToolPort): readonly SurfaceId[] | undefined => {
  if (tool.allowedSurfaces && tool.allowedSurfaces.length > 0) {
    return tool.allowedSurfaces;
  }

  if (!tool.appId || tool.appId === "common" || tool.appId === "assistant") {
    return ["shared"];
  }

  return APP_DEFAULT_SURFACES[tool.appId] ?? ["platform"];
};

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

  async listForTenant(
    tenantId: string,
    activeAppId?: string,
    surfaceId: SurfaceId = "platform"
  ): Promise<DomainToolPort[]> {
    const flatTools =
      Array.isArray(this.tools) && Array.isArray(this.tools[0])
        ? (this.tools as DomainToolPort[][]).flat()
        : (this.tools as DomainToolPort[]);

    let availableTools = flatTools;

    const shouldBypassEntitlements = isFreelancerScopedContext(activeAppId);

    if (this.entitlementsRead && !shouldBypassEntitlements) {
      const appEnablement = await this.entitlementsRead
        .getAppEnablementMap(tenantId)
        .catch(() => null);

      if (appEnablement) {
        availableTools = availableTools.filter((tool) => {
          if (!tool.appId || tool.appId === "common") {
            return true;
          }
          if (activeAppId && tool.appId === activeAppId) {
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

    availableTools = availableTools.filter((tool) =>
      isSurfaceAllowed(surfaceId, resolveAllowedSurfaces(tool))
    );

    return availableTools;
  }
}
