import { ForbiddenException, Inject, Injectable } from "@nestjs/common";
import {
  WORKSPACE_REPOSITORY_PORT,
  type WorkspaceRepositoryPort,
} from "../ports/workspace-repository.port";

/** Narrow cross-product policy API; callers never inspect membership tables. */
@Injectable()
export class AuthorizeWorkspaceUseCase {
  constructor(
    @Inject(WORKSPACE_REPOSITORY_PORT)
    private readonly repo: Pick<
      WorkspaceRepositoryPort,
      "getWorkspaceById" | "getMembershipByUserAndWorkspace"
    >
  ) {}
  async execute(input: {
    tenantId: string;
    workspaceId: string;
    userId: string;
    manage?: boolean;
  }): Promise<{ slug?: string; name: string; canManage?: boolean }> {
    const workspace = await this.repo.getWorkspaceById(input.tenantId, input.workspaceId);
    const membership = workspace
      ? await this.repo.getMembershipByUserAndWorkspace(input.workspaceId, input.userId)
      : null;
    if (
      !workspace ||
      !membership ||
      membership.status !== "ACTIVE" ||
      (input.manage && !["OWNER", "ADMIN"].includes(membership.role))
    ) {
      throw new ForbiddenException("Workspace access denied");
    }
    return {
      slug: workspace.slug,
      name: workspace.name,
      canManage: ["OWNER", "ADMIN"].includes(membership.role),
    };
  }
}
