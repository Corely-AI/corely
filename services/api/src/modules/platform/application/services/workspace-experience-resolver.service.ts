import { Inject, Injectable, NotFoundException } from "@nestjs/common";
import type {
  PosVerticalId,
  SurfaceId,
  WorkspaceCapabilities,
  WorkspaceKind,
} from "@corely/contracts";
import { TenantEntitlement } from "../../domain/entitlement.aggregate";
import { TenantEntitlementService } from "./tenant-entitlement.service";
import { WorkspaceTemplateService } from "./workspace-template.service";
import {
  WORKSPACE_REPOSITORY_PORT,
  type WorkspaceRepositoryPort,
} from "../../../workspaces/application/ports/workspace-repository.port";
import type { Workspace } from "../../../workspaces/domain/workspace.entity";

export interface ResolveWorkspaceExperienceInput {
  tenantId: string;
  userId: string;
  surfaceId: SurfaceId;
  workspaceId?: string;
  permissions?: Iterable<string>;
}

export interface WorkspaceExperienceContext {
  tenantId: string;
  userId: string;
  workspaceId?: string;
  surfaceId: SurfaceId;
  verticalId: PosVerticalId | null;
  workspaceKind: WorkspaceKind;
  workspace: Workspace | null;
  entitlement: TenantEntitlement;
  permissions: Set<string>;
  capabilityKeys: Set<string>;
  enabledCapabilities: Set<string>;
  capabilities: WorkspaceCapabilities;
}

@Injectable()
export class WorkspaceExperienceResolverService {
  constructor(
    private readonly entitlementService: TenantEntitlementService,
    private readonly templateService: WorkspaceTemplateService,
    @Inject(WORKSPACE_REPOSITORY_PORT)
    private readonly workspaceRepo: WorkspaceRepositoryPort
  ) {}

  async resolve(input: ResolveWorkspaceExperienceInput): Promise<WorkspaceExperienceContext> {
    const entitlement = await this.entitlementService.getTenantEntitlement(input.tenantId);
    const workspace = await this.resolveWorkspace(input.tenantId, input.workspaceId);
    const workspaceKind = workspace?.legalEntity?.kind === "COMPANY" ? "COMPANY" : "PERSONAL";
    const capabilities = this.templateService.getDefaultCapabilities(workspaceKind);
    const capabilityKeys = new Set(Object.keys(capabilities));
    const enabledCapabilities = new Set(
      Object.entries(capabilities)
        .filter(([, enabled]) => enabled)
        .map(([key]) => key)
    );

    return {
      tenantId: input.tenantId,
      userId: input.userId,
      workspaceId: workspace?.id ?? input.workspaceId,
      surfaceId: input.surfaceId,
      verticalId: workspace?.verticalId ?? null,
      workspaceKind,
      workspace,
      entitlement,
      permissions: new Set(input.permissions ?? []),
      capabilityKeys,
      enabledCapabilities,
      capabilities,
    };
  }

  private async resolveWorkspace(
    tenantId: string,
    workspaceId?: string
  ): Promise<Workspace | null> {
    if (!workspaceId) {
      return null;
    }

    const workspace = await this.workspaceRepo.getWorkspaceByIdWithLegalEntity(
      tenantId,
      workspaceId
    );
    if (!workspace) {
      throw new NotFoundException("Workspace not found");
    }

    return workspace;
  }
}
