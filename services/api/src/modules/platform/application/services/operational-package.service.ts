import { Inject, Injectable } from "@nestjs/common";
import {
  isExperienceTargetVisible,
  type AppManifest,
  type OperationalExperience,
  type OperationalExperienceContribution,
  type OperationalPackage,
  type OperationalUnavailableReason,
  type WorkspaceCapabilities,
} from "@corely/contracts";
import { TenantEntitlementsService } from "../../../platform-entitlements";
import { APP_REGISTRY_TOKEN, type AppRegistryPort } from "../ports/app-registry.port";
import { DependencyResolverService } from "./dependency-resolver.service";
import type { WorkspaceExperienceContext } from "./workspace-experience-resolver.service";
import { ValidationError } from "@corely/kernel";

export const operationalCapabilities = (
  defaults: WorkspaceCapabilities
): WorkspaceCapabilities => ({
  ...(Object.fromEntries(
    Object.keys(defaults).map((key) => [key, false])
  ) as WorkspaceCapabilities),
  "workspace.multiUser": true,
  "workspace.rbac": true,
  "booking.basic": true,
});

@Injectable()
export class OperationalPackageService {
  constructor(
    @Inject(APP_REGISTRY_TOKEN) private readonly registry: AppRegistryPort,
    private readonly dependencyResolver: DependencyResolverService,
    private readonly entitlements: TenantEntitlementsService
  ) {}

  async compose(
    context: WorkspaceExperienceContext,
    isWorkspaceAdmin: boolean
  ): Promise<OperationalPackage> {
    const effective = await this.entitlements.getEntitlements(context.tenantId);
    const features = new Map(effective.features.map((feature) => [feature.key, feature.value]));
    const providers = this.registry
      .list()
      .flatMap((manifest) =>
        (manifest.operationalExperiences ?? []).map((contribution) => ({ manifest, contribution }))
      );
    const definitions = [
      { id: "schedule", label: "Schedule" },
      { id: "team", label: "Team" },
      { id: "daily-work", label: "Daily Work" },
    ] as const;

    return {
      packageId: "internal-operations",
      client: "openbuk-web",
      experiences: definitions.map((definition): OperationalExperience => {
        const candidates = providers.filter(
          ({ contribution }) => contribution.experienceId === definition.id
        );
        const evaluated = candidates.map(
          ({ manifest, contribution }): OperationalExperience => ({
            ...definition,
            appId: manifest.appId,
            availability: this.availability(
              manifest,
              contribution,
              context,
              isWorkspaceAdmin,
              features
            ),
          })
        );
        return (
          evaluated.find((item) => item.availability.status === "available") ??
          evaluated[0] ?? {
            ...definition,
            availability: { status: "unavailable", reason: "not-implemented" },
          }
        );
      }),
    };
  }

  private availability(
    manifest: AppManifest,
    contribution: OperationalExperienceContribution,
    context: WorkspaceExperienceContext,
    isWorkspaceAdmin: boolean,
    features: Map<string, unknown>
  ): OperationalExperience["availability"] {
    const unavailable = (
      reason: OperationalUnavailableReason
    ): OperationalExperience["availability"] => ({ status: "unavailable", reason });

    if (!context.entitlement.isAppEnabled(manifest.appId)) {
      return unavailable("app-disabled");
    }
    let dependencies: string[];
    try {
      dependencies = this.dependencyResolver.resolve(manifest.appId, this.registry);
    } catch (error) {
      if (error instanceof ValidationError) {
        return unavailable("dependency-unavailable");
      }
      throw error;
    }
    if (dependencies.some((appId) => !context.entitlement.isAppEnabled(appId))) {
      return unavailable("dependency-unavailable");
    }
    if (
      (contribution.requiredCapabilities ?? []).some(
        (key) => !context.entitlement.hasCapability(key) || !context.enabledCapabilities.has(key)
      )
    ) {
      return unavailable("workspace-capability-disabled");
    }
    if (
      (contribution.requiresWorkspaceAdmin && !isWorkspaceAdmin) ||
      !isExperienceTargetVisible(contribution, {
        surfaceId: context.surfaceId,
        verticalId: context.verticalId,
        capabilities: context.enabledCapabilities,
        permissions: context.permissions,
      })
    ) {
      return unavailable("permission-denied");
    }
    if (contribution.requiredFeatureKey && features.get(contribution.requiredFeatureKey) !== true) {
      return unavailable("product-not-entitled");
    }
    return { status: "available", route: contribution.route };
  }
}
