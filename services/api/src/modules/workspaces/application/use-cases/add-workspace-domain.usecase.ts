import { BadRequestException, ForbiddenException, Inject, Injectable } from "@nestjs/common";
import type { CreateWorkspaceDomainOutput } from "@corely/contracts";
import {
  WORKSPACE_REPOSITORY_PORT,
  type WorkspaceRepositoryPort,
} from "../ports/workspace-repository.port";
import {
  ID_GENERATOR_TOKEN,
  type IdGeneratorPort,
} from "../../../../shared/ports/id-generator.port";
import { toWorkspaceDomainDto } from "../mappers/workspace-domain.mapper";

export interface AddWorkspaceDomainCommand {
  tenantId: string;
  userId: string;
  workspaceId: string;
  domain: string;
}

@Injectable()
export class AddWorkspaceDomainUseCase {
  constructor(
    @Inject(WORKSPACE_REPOSITORY_PORT)
    private readonly workspaceRepo: WorkspaceRepositoryPort,
    @Inject(ID_GENERATOR_TOKEN)
    private readonly idGenerator: IdGeneratorPort
  ) {}

  async execute(command: AddWorkspaceDomainCommand): Promise<CreateWorkspaceDomainOutput> {
    const hasAccess = await this.workspaceRepo.checkUserHasWorkspaceAccess(
      command.tenantId,
      command.workspaceId,
      command.userId
    );

    if (!hasAccess) {
      throw new ForbiddenException("You do not have access to this workspace");
    }

    const normalizedDomain = normalizeDomain(command.domain);
    const existing = await this.workspaceRepo.listWorkspaceDomains(command.workspaceId);
    const isPrimary = existing.length === 0;

    const created = await this.workspaceRepo.createWorkspaceDomain({
      id: this.idGenerator.newId(),
      workspaceId: command.workspaceId,
      domain: normalizedDomain,
      isPrimary,
    });

    return { domain: toWorkspaceDomainDto(created) };
  }
}

const normalizeDomain = (raw: string): string => {
  const trimmed = raw.trim().toLowerCase();
  if (!trimmed) {
    throw new BadRequestException("Domain is required");
  }

  if (trimmed.includes("//")) {
    throw new BadRequestException("Domain must not include a scheme");
  }

  const withoutPath = trimmed.split("/")[0];
  if (withoutPath.includes(":")) {
    throw new BadRequestException("Domain must not include a port");
  }
  const withoutPort = withoutPath;

  if (!withoutPort) {
    throw new BadRequestException("Domain must be a valid hostname");
  }

  if (
    !/^[a-z0-9.-]+$/.test(withoutPort) ||
    withoutPort.startsWith(".") ||
    withoutPort.endsWith(".") ||
    withoutPort.includes("..")
  ) {
    throw new BadRequestException("Domain must be a valid hostname");
  }

  return withoutPort;
};
