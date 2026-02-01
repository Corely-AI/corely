import { ForbiddenException, Inject, Injectable, NotFoundException } from "@nestjs/common";
import type { DeleteWorkspaceDomainOutput } from "@corely/contracts";
import {
  WORKSPACE_REPOSITORY_PORT,
  type WorkspaceRepositoryPort,
} from "../ports/workspace-repository.port";

export interface DeleteWorkspaceDomainCommand {
  tenantId: string;
  userId: string;
  workspaceId: string;
  domainId: string;
}

@Injectable()
export class DeleteWorkspaceDomainUseCase {
  constructor(
    @Inject(WORKSPACE_REPOSITORY_PORT)
    private readonly workspaceRepo: WorkspaceRepositoryPort
  ) {}

  async execute(command: DeleteWorkspaceDomainCommand): Promise<DeleteWorkspaceDomainOutput> {
    const hasAccess = await this.workspaceRepo.checkUserHasWorkspaceAccess(
      command.tenantId,
      command.workspaceId,
      command.userId
    );

    if (!hasAccess) {
      throw new ForbiddenException("You do not have access to this workspace");
    }

    const deleted = await this.workspaceRepo.deleteWorkspaceDomain(
      command.workspaceId,
      command.domainId
    );

    if (!deleted) {
      throw new NotFoundException("Workspace domain not found");
    }

    return { success: true };
  }
}
