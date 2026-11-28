import { ForbiddenException, Injectable } from "@nestjs/common";
import type { EffectivePermissionsResponse } from "@corely/contracts";
import type { UseCaseContext } from "@corely/kernel";
import { GetEffectivePermissionsUseCase } from "../../../identity/public";
import type { DomainToolPort } from "../ports/domain-tool.port";

/** Reused for prompt exposure and immediately before every server-side action. */
@Injectable()
export class AuthorizeToolService {
  constructor(private readonly permissions: GetEffectivePermissionsUseCase) {}

  async filterAllowed(tools: DomainToolPort[], ctx: UseCaseContext): Promise<DomainToolPort[]> {
    // One fresh snapshot for this prompt, never a cached authorization for execution.
    const permissions = this.hasContext(ctx)
      ? (await this.permissions.execute(ctx)).permissions
      : null;
    return tools.filter(
      (tool) => tool.kind !== "server" || (permissions && this.hasPermissions(tool, permissions))
    );
  }

  async allows(tool: DomainToolPort, ctx: UseCaseContext): Promise<boolean> {
    if (!this.hasContext(ctx)) {
      return false;
    }
    return this.hasPermissions(tool, (await this.permissions.execute(ctx)).permissions);
  }

  async assert(tool: DomainToolPort, ctx: UseCaseContext): Promise<void> {
    if (!(await this.allows(tool, ctx))) {
      throw new ForbiddenException("Tool access denied");
    }
  }

  private hasContext(ctx: UseCaseContext): boolean {
    return Boolean(ctx.userId && ctx.tenantId && ctx.workspaceId);
  }

  private hasPermissions(
    tool: DomainToolPort,
    permissions: EffectivePermissionsResponse["permissions"]
  ): boolean {
    // Undeclared tools are privileged legacy capabilities, never inferred staff access.
    if (!tool.requiredPermissions?.length) {
      return permissions.allowAll && permissions.denied.length === 0;
    }
    return tool.requiredPermissions.every(
      (key) =>
        !permissions.denied.includes(key) &&
        (permissions.allowAll || permissions.allowed.includes(key))
    );
  }
}
