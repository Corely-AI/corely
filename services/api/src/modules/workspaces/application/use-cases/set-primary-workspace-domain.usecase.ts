import { ForbiddenException, Inject, Injectable, NotFoundException } from "@nestjs/common";
import type { SetPrimaryWorkspaceDomainOutput } from "@corely/contracts";
import {
  WORKSPACE_REPOSITORY_PORT,
  type WorkspaceRepositoryPort,
} from "../ports/workspace-repository.port";
import { toWorkspaceDomainDto } from "../mappers/workspace-domain.mapper";

export interface SetPrimaryWorkspaceDomainCommand {
  tenantId: string;
  userId: string;
  workspaceId: string;
  domainId: string;
}

@Injectable()
export class SetPrimaryWorkspaceDomainUseCase {
  constructor(
    @Inject(WORKSPACE_REPOSITORY_PORT)
    private readonly workspaceRepo: WorkspaceRepositoryPort
  ) {}

  async execute(
    command: SetPrimaryWorkspaceDomainCommand
  ): Promise<SetPrimaryWorkspaceDomainOutput> {
    const hasAccess = await this.workspaceRepo.checkUserHasWorkspaceAccess(
      command.tenantId,
      command.workspaceId,
      command.userId
    );

    if (!hasAccess) {
      throw new ForbiddenException("You do not have access to this workspace");
    }

    let updated;
    try {
      updated = await this.workspaceRepo.setPrimaryWorkspaceDomain(
        command.workspaceId,
        command.domainId
      );
    } catch {
      updated = null;
    }

    if (!updated) {
      throw new NotFoundException("Workspace domain not found");
    }

    return { domain: toWorkspaceDomainDto(updated) };
  }
}
