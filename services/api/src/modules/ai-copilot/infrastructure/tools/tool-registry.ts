import { Inject, Injectable, Optional } from "@nestjs/common";
import { DomainToolPort } from "../../application/ports/domain-tool.port";
import { ToolRegistryPort, COPILOT_TOOLS } from "../../application/ports/tool-registry.port";

@Injectable()
export class ToolRegistry implements ToolRegistryPort {
  constructor(
    @Optional()
    @Inject(COPILOT_TOOLS)
    private readonly tools: DomainToolPort[] | DomainToolPort[][] = []
  ) {}

  listForTenant(_tenantId: string): DomainToolPort[] {
    return Array.isArray(this.tools) && Array.isArray(this.tools[0])
      ? (this.tools as DomainToolPort[][]).flat()
      : (this.tools as DomainToolPort[]);
  }
}
