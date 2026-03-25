import { BadRequestException, Injectable, Inject, Logger } from "@nestjs/common";
import type { MenuGroup, MenuItem, SurfaceId } from "@corely/contracts";
import { MenuComposerService } from "../services/menu-composer.service";
import { WorkspaceExperienceResolverService } from "../services/workspace-experience-resolver.service";
import { WorkspaceTemplateService } from "../services/workspace-template.service";
import {
  buildSurfaceResolutionLogFields,
  evaluateSurfaceAwareRequest,
  type SurfaceResolutionSource,
} from "../../../../shared/request-context/request-surface";
import {
  TENANT_APP_INSTALL_REPOSITORY_TOKEN,
  type TenantAppInstallRepositoryPort,
} from "../ports/tenant-app-install-repository.port";
import { randomUUID } from "crypto";
import { APP_REGISTRY_TOKEN, type AppRegistryPort } from "../ports/app-registry.port";

export interface ComposeMenuInput {
  tenantId: string;
  userId: string;
  permissions: string[];
  scope: "web" | "pos";
  workspaceId?: string; // Optional: if not provided, menu won't include workspace metadata
  surfaceId: SurfaceId;
  trustedSurfaceId?: SurfaceId | null;
  declaredSurfaceId?: string;
  surfaceResolutionSource: SurfaceResolutionSource;
  surfaceHeaderMismatch: boolean;
  route: string;
}

export interface ComposeMenuOutput {
  scope: string;
  items: MenuItem[];
  groups: MenuGroup[];
  computedAt: string;
  surfaceId: SurfaceId;
  // Workspace metadata for server-driven UI
  workspace?: {
    kind: "PERSONAL" | "COMPANY";
    capabilities: {
      multiUser: boolean;
      quotes: boolean;
      aiCopilot: boolean;
      rbac: boolean;
      // Add more as needed
    };
    terminology: {
      partyLabel: string;
      partyLabelPlural: string;
    };
  };
}

@Injectable()
export class ComposeMenuUseCase {
  private readonly logger = new Logger(ComposeMenuUseCase.name);

  constructor(
    private readonly menuComposer: MenuComposerService,
    private readonly experienceResolver: WorkspaceExperienceResolverService,
    private readonly templateService: WorkspaceTemplateService,
    @Inject(TENANT_APP_INSTALL_REPOSITORY_TOKEN)
    private readonly appInstallRepo: TenantAppInstallRepositoryPort,
    @Inject(APP_REGISTRY_TOKEN)
    private readonly appRegistry: AppRegistryPort
  ) {}

  async execute(input: ComposeMenuInput): Promise<ComposeMenuOutput> {
    const surfaceLogFields = buildSurfaceResolutionLogFields({
      requestContext: {
        surfaceId: input.surfaceId,
        trustedSurfaceId: input.trustedSurfaceId,
        declaredSurfaceId: input.declaredSurfaceId,
        surfaceResolutionSource: input.surfaceResolutionSource,
        surfaceHeaderMismatch: input.surfaceHeaderMismatch,
        workspaceId: input.workspaceId ?? null,
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
          event: "menu.surface-resolution-rejected",
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
          event: "menu.vertical-resolution-missing",
          ...surfaceLogFields,
          resolvedSurfaceId: experience.surfaceId,
          resolvedVerticalId: experience.verticalId,
          fallbackSurfaceResolution: input.surfaceResolutionSource !== "proxy-key",
        })
      );
      throw new BadRequestException(
        "POS menu composition requires a configured workspace vertical"
      );
    }

    this.logger.log(
      JSON.stringify({
        event: "menu.surface-resolution",
        ...surfaceLogFields,
        resolvedSurfaceId: experience.surfaceId,
        resolvedVerticalId: experience.verticalId,
        fallbackSurfaceResolution: input.surfaceResolutionSource !== "proxy-key",
      })
    );

    // Ensure tenant has default apps installed; fall back to PERSONAL defaults if kind unknown
    const workspace = experience.workspace;
    const workspaceKind = experience.workspaceKind;

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

    // Optionally include workspace metadata for server-driven UI
    let workspaceMetadata: ComposeMenuOutput["workspace"] | undefined;

    if (workspace && workspace.legalEntity) {
      const defaultTerminology = this.templateService.getDefaultTerminology(workspaceKind);
      const defaultCapabilities = experience.capabilities;

      workspaceMetadata = {
        kind: workspaceKind,
        capabilities: {
          multiUser: defaultCapabilities["workspace.multiUser"],
          quotes: defaultCapabilities["sales.quotes"],
          aiCopilot: defaultCapabilities["ai.copilot"],
          rbac: defaultCapabilities["workspace.rbac"],
        },
        terminology: {
          partyLabel: defaultTerminology.partyLabel,
          partyLabelPlural: defaultTerminology.partyLabelPlural,
        },
      };
    }

    return {
      scope: input.scope,
      items: menu.items,
      groups: menu.groups,
      computedAt: new Date().toISOString(),
      surfaceId: experience.surfaceId,
      workspace: workspaceMetadata,
    };
  }

  /**
   * Ensure default apps for the workspace kind are enabled for the tenant.
   * Runs on every menu request but upserts are idempotent.
   */
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
