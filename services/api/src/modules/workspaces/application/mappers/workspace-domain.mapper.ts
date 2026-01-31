import type { WorkspaceDomainDto } from "@corely/contracts";
import type { WorkspaceDomain } from "../../domain/workspace.entity";

export const toWorkspaceDomainDto = (domain: WorkspaceDomain): WorkspaceDomainDto => ({
  id: domain.id,
  workspaceId: domain.workspaceId,
  domain: domain.domain,
  isPrimary: domain.isPrimary,
  createdAt: domain.createdAt.toISOString(),
});
