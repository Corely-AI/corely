import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  Inject,
  Logger,
} from "@nestjs/common";
import type {
  MenuGroup,
  SurfaceId,
  WorkspaceConfig,
  WorkspaceNavigationGroup,
  WorkspaceMembershipRole,
} from "@corely/contracts";
import { MenuComposerService } from "../services/menu-composer.service";
import { WorkspaceExperienceResolverService } from "../services/workspace-experience-resolver.service";
import { WorkspaceTemplateService } from "../services/workspace-template.service";
import {
  buildSurfaceResolutionLogFields,
  evaluateSurfaceAwareRequest,
  type SurfaceResolutionSource,
} from "../../../../shared/request-context/request-surface";
import {
  WORKSPACE_REPOSITORY_PORT,
  type WorkspaceRepositoryPort,
} from "../../../workspaces/application/ports/workspace-repository.port";
import {
  TENANT_APP_INSTALL_REPOSITORY_TOKEN,
  type TenantAppInstallRepositoryPort,
} from "../ports/tenant-app-install-repository.port";
import { APP_REGISTRY_TOKEN, type AppRegistryPort } from "../ports/app-registry.port";
import { randomUUID } from "crypto";

export interface GetWorkspaceConfigInput {
  tenantId: string;
  userId: string;
  workspaceId: string;
  permissions: string[];
  scope: "web" | "pos";
  surfaceId: SurfaceId;
  trustedSurfaceId?: SurfaceId | null;
  declaredSurfaceId?: string;
  surfaceResolutionSource: SurfaceResolutionSource;
  surfaceHeaderMismatch: boolean;
  route: string;
}

@Injectable()
export class GetWorkspaceConfigUseCase {
  private readonly logger = new Logger(GetWorkspaceConfigUseCase.name);

  constructor(
    private readonly menuComposer: MenuComposerService,
    private readonly experienceResolver: WorkspaceExperienceResolverService,
    private readonly templateService: WorkspaceTemplateService,
    @Inject(WORKSPACE_REPOSITORY_PORT)
    private readonly workspaceRepo: WorkspaceRepositoryPort,
    @Inject(TENANT_APP_INSTALL_REPOSITORY_TOKEN)
    private readonly appInstallRepo: TenantAppInstallRepositoryPort,
    @Inject(APP_REGISTRY_TOKEN)
    private readonly appRegistry: AppRegistryPort
  ) {}

  async execute(input: GetWorkspaceConfigInput): Promise<WorkspaceConfig> {
    const surfaceLogFields = buildSurfaceResolutionLogFields({
      requestContext: {
        surfaceId: input.surfaceId,
        trustedSurfaceId: input.trustedSurfaceId,
        declaredSurfaceId: input.declaredSurfaceId,
        surfaceResolutionSource: input.surfaceResolutionSource,
        surfaceHeaderMismatch: input.surfaceHeaderMismatch,
        workspaceId: input.workspaceId,
      },
      route: input.route,
      workspaceId: input.workspaceId,
    });
    const surfacePolicy = evaluateSurfaceAwareRequest(
      {
        declaredSurfaceId: input.declaredSurfaceId,
        surfaceHeaderMismatch: input.surfaceHeaderMismatch,
        surfaceResolutionSource: input.surfaceResolutionSource,
        trustedSurfaceId: input.trustedSurfaceId,
      },
      input.scope
    );

    if (!surfacePolicy.ok) {
      this.logger.warn(
        JSON.stringify({
          event: "workspace-config.surface-resolution-rejected",
          ...surfaceLogFields,
          reason: surfacePolicy.errorCode,
        })
      );
      throw new BadRequestException(surfacePolicy.message);
    }

    let experience = await this.experienceResolver.resolve({
      tenantId: input.tenantId,
      userId: input.userId,
      workspaceId: input.workspaceId,
      surfaceId: input.surfaceId,
      permissions: input.permissions,
    });

    if (experience.surfaceId === "pos" && !experience.verticalId) {
      this.logger.warn(
        JSON.stringify({
          event: "workspace-config.vertical-resolution-missing",
          ...surfaceLogFields,
          resolvedSurfaceId: experience.surfaceId,
          resolvedVerticalId: experience.verticalId,
          fallbackSurfaceResolution: input.surfaceResolutionSource !== "proxy-key",
        })
      );
      throw new BadRequestException(
        "POS workspace configuration requires a configured workspace vertical"
      );
    }

    this.logger.log(
      JSON.stringify({
        event: "workspace-config.surface-resolution",
        ...surfaceLogFields,
        resolvedSurfaceId: experience.surfaceId,
        resolvedVerticalId: experience.verticalId,
        fallbackSurfaceResolution: input.surfaceResolutionSource !== "proxy-key",
      })
    );

    const hasAccess = await this.workspaceRepo.checkUserHasWorkspaceAccess(
      input.tenantId,
      input.workspaceId,
      input.userId
    );
    if (!hasAccess) {
      throw new ForbiddenException("You do not have access to this workspace");
    }

    const workspace = experience.workspace;
    if (!workspace || !workspace.legalEntity) {
      throw new NotFoundException("Workspace not found");
    }

    const workspaceKind = experience.workspaceKind;
    const capabilities = experience.capabilities;

    const installedDefaults = await this.ensureDefaultAppsInstalled(
      input.tenantId,
      input.userId,
      workspaceKind
    );
    if (installedDefaults) {
      experience = await this.experienceResolver.resolve({
        tenantId: input.tenantId,
        userId: input.userId,
        workspaceId: input.workspaceId,
        surfaceId: input.surfaceId,
        permissions: input.permissions,
      });
    }

    const menu = await this.menuComposer.composeMenuTree({
      tenantId: input.tenantId,
      userId: input.userId,
      permissions: experience.permissions,
      scope: input.scope,
      surfaceId: experience.surfaceId,
      verticalId: experience.verticalId,
      entitlement: experience.entitlement,
      capabilityFilter: experience.enabledCapabilities,
      capabilityKeys: experience.capabilityKeys,
    });

    const membership = await this.workspaceRepo.getMembershipByUserAndWorkspace(
      input.workspaceId,
      input.userId
    );
    const membershipRole = (membership?.role ?? "MEMBER") as WorkspaceMembershipRole;
    const isWorkspaceAdmin = membershipRole === "OWNER" || membershipRole === "ADMIN";

    return {
      workspaceId: workspace.id,
      surfaceId: experience.surfaceId,
      verticalId: experience.verticalId,
      kind: workspaceKind,
      capabilities,
      terminology: this.templateService.getDefaultTerminology(workspaceKind),
      navigation: {
        groups: this.buildNavigationGroups(menu.groups),
      },
      home: {
        widgets: this.templateService.getDefaultHomeWidgets(workspaceKind),
      },
      currentUser: {
        membershipRole,
        isWorkspaceAdmin,
      },
      computedAt: new Date().toISOString(),
    };
  }

  private buildNavigationGroups(groups: MenuGroup[]): WorkspaceNavigationGroup[] {
    return groups.map((group, index) => ({
      id: group.appId,
      labelKey: group.labelKey ?? group.defaultLabel,
      defaultLabel: group.defaultLabel,
      order: index + 1,
      items: group.items,
    }));
  }

  private async ensureDefaultAppsInstalled(
    tenantId: string,
    userId: string,
    workspaceKind: "PERSONAL" | "COMPANY"
  ): Promise<boolean> {
    const currentInstalls = await this.appInstallRepo.listEnabledByTenant(tenantId);
    const installed = new Set(currentInstalls.map((i) => i.appId));
    const defaultApps = this.templateService.getDefaultEnabledApps(workspaceKind);
    let installedAny = false;

    for (const appId of defaultApps) {
      if (installed.has(appId)) {
        continue;
      }
      const manifest = this.appRegistry.get(appId);
      if (!manifest) {
        continue;
      }
      await this.appInstallRepo.upsert({
        id: randomUUID(),
        tenantId,
        appId,
        enabled: true,
        installedVersion: manifest.version ?? "1.0.0",
        enabledAt: new Date(),
        enabledByUserId: userId,
      });
      installedAny = true;
    }

    return installedAny;
  }
}
