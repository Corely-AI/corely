import { ForbiddenException, Inject, Injectable } from "@nestjs/common";
import type { UseCaseContext } from "@corely/kernel";
import { AuthorizeWorkspaceUseCase } from "../../../workspaces/public";
import {
  MEMBERSHIP_REPOSITORY_TOKEN,
  type MembershipRepositoryPort,
} from "../ports/membership-repository.port";

/** Validates authenticated context without granting any resource permission. */
@Injectable()
export class AuthorizeRequestContextUseCase {
  constructor(
    @Inject(MEMBERSHIP_REPOSITORY_TOKEN) private readonly memberships: MembershipRepositoryPort,
    private readonly authorizeWorkspace: AuthorizeWorkspaceUseCase
  ) {}

  async execute(ctx: UseCaseContext): Promise<{ roleIds: string[] }> {
    if (!ctx.userId || ctx.tenantId === undefined) {
      throw new ForbiddenException("Authenticated tenant or host context required");
    }
    const member = await this.memberships.findByTenantAndUser(ctx.tenantId, ctx.userId);
    if (!member) {
      throw new ForbiddenException("Current tenant membership required");
    }
    if (ctx.workspaceId) {
      if (!ctx.tenantId) {
        throw new ForbiddenException("Workspace requires tenant context");
      }
      await this.authorizeWorkspace.execute({
        tenantId: ctx.tenantId,
        workspaceId: ctx.workspaceId,
        userId: ctx.userId,
      });
    }
    return { roleIds: [member.getRoleId()] };
  }
}
