import { Injectable, Inject, ConflictException, NotFoundException, Optional } from "@nestjs/common";
import { AUDIT_PORT, type AuditPort, type TransactionContext } from "@corely/kernel";
import { EnableAppUseCase } from "../../platform/public";
import { PrismaService, getPrismaClient } from "@corely/data";
import { FeatureCatalogService } from "./feature-catalog.service";
import {
  type FeatureSource,
  ResolvedAppEntitlement,
  ResolvedFeatureValue,
  TenantEntitlements,
} from "../domain/entitlement.types";
import { BILLING_ACCESS_PORT, type BillingAccessPort } from "../../billing";

@Injectable()
export class TenantEntitlementsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly featureCatalog: FeatureCatalogService,
    private readonly enableApp: EnableAppUseCase,
    @Inject(AUDIT_PORT) private readonly audit: AuditPort,
    @Optional()
    @Inject(BILLING_ACCESS_PORT)
    private readonly billingAccess?: BillingAccessPort
  ) {}

  async getEntitlements(tenantId: string, tx?: TransactionContext): Promise<TenantEntitlements> {
    // Enablement is authorization state. A cache local to one API instance cannot
    // observe a host's disable command handled by another instance.
    return this.computeEntitlements(tenantId, tx);
  }

  private async computeEntitlements(
    tenantId: string,
    tx?: TransactionContext
  ): Promise<TenantEntitlements> {
    // 1. Fetch overrides

    const overrides = await getPrismaClient(this.prisma, tx).tenantFeatureOverride.findMany({
      where: { tenantId },
    });
    const overrideMap = new Map<string, unknown>(
      overrides.map((o) => [o.featureKey, JSON.parse(o.valueJson)])
    );

    const planFeatures = this.billingAccess
      ? tx
        ? await this.billingAccess.getAllPlanFeatureValues(tenantId, tx)
        : await this.billingAccess.getAllPlanFeatureValues(tenantId).catch(() => ({}))
      : {};

    // 2. Resolve Features
    const allFeatures = this.featureCatalog.getAllFeatures();
    const resolvedFeatures: ResolvedFeatureValue[] = [];

    for (const feat of allFeatures) {
      let value = feat.defaultValue;
      let source: FeatureSource = "default";

      if (Object.prototype.hasOwnProperty.call(planFeatures, feat.key)) {
        value = planFeatures[feat.key];
        source = "plan";
      }

      if (overrideMap.has(feat.key)) {
        value = overrideMap.get(feat.key);
        source = "tenantOverride";
      }

      resolvedFeatures.push({ key: feat.key, value, source });
    }

    // 3. Resolve Apps
    const allApps = this.featureCatalog.getAllAppEntitlements();
    const resolvedApps: ResolvedAppEntitlement[] = [];

    // Helper to get feature value
    const getFeatureValue = (key: string) => resolvedFeatures.find((f) => f.key === key)?.value;

    for (const app of allApps) {
      const enabledVal = getFeatureValue(app.enabledFeatureKey);
      const isEnabled = enabledVal === true;
      const source =
        resolvedFeatures.find((f) => f.key === app.enabledFeatureKey)?.source || "default";

      resolvedApps.push({
        appId: app.appId,
        enabled: isEnabled,
        source,
        dependencies: app.dependencies,
      });
    }

    return {
      apps: resolvedApps,
      features: resolvedFeatures,
      generatedAt: new Date().toISOString(),
    };
  }

  async updateAppEnablement(
    tenantId: string,
    appId: string,
    enabled: boolean,
    userId: string,
    cascade: boolean = false,
    expectedDependents?: readonly string[]
  ): Promise<void> {
    const appEntitlement = this.featureCatalog.getAppEntitlementDefinition(appId);
    if (!appEntitlement) {
      throw new NotFoundException(`App ${appId} not found`);
    }

    await this.prisma.$transaction(
      async (tx) => {
        const context = tx as unknown as TransactionContext;
        const dependents = enabled ? [] : await this.findDependents(tenantId, appId, context);
        if (dependents.length && !cascade) {
          throw new ConflictException({
            message: `Cannot disable ${appId} while dependent apps are enabled: ${dependents.join(", ")}`,
            dependents,
          });
        }
        if (!enabled && cascade && expectedDependents !== undefined) {
          const approved = new Set(expectedDependents);
          if (dependents.some((id) => !approved.has(id))) {
            throw new ConflictException({
              message: "Dependent apps changed. Review the updated list before disabling.",
              dependents,
              approvalChanged: true,
            });
          }
        }
        const affected = enabled ? this.resolveDependencies(appId) : [appId, ...dependents];
        if (enabled) {
          // Platform owns install records, dependency validation and the enabled audit.
          await this.enableApp.execute({ tenantId, appId, actorUserId: userId }, context);
        }
        for (const id of affected) {
          const definition = this.featureCatalog.getAppEntitlementDefinition(id);
          if (!definition) {
            throw new NotFoundException(`App ${id} not found`);
          }
          await tx.tenantFeatureOverride.upsert({
            where: { tenantId_featureKey: { tenantId, featureKey: definition.enabledFeatureKey } },
            create: {
              tenantId,
              featureKey: definition.enabledFeatureKey,
              valueJson: JSON.stringify(enabled),
              updatedBy: userId,
            },
            update: { valueJson: JSON.stringify(enabled), updatedBy: userId },
          });
        }
        if (!enabled) {
          await this.audit.log(
            {
              tenantId,
              userId,
              action: "platform.app.disabled",
              entityType: "App",
              entityId: appId,
              metadata: { disabledDependents: dependents },
            },
            context
          );
        }
      },
      { isolationLevel: "Serializable" }
    );
  }

  async updateFeatures(
    tenantId: string,
    updates: { key: string; value: unknown }[],
    userId: string
  ): Promise<void> {
    // Validate
    for (const update of updates) {
      const def = this.featureCatalog.getFeatureDefinition(update.key);
      if (!def) {
        throw new NotFoundException(`Feature ${update.key} not found`);
      }
      // Basic type check
      // TODO: Detailed validation
    }

    await this.prisma.$transaction(async (tx) => {
      for (const update of updates) {
        await tx.tenantFeatureOverride.upsert({
          where: { tenantId_featureKey: { tenantId, featureKey: update.key } },
          create: {
            tenantId,
            featureKey: update.key,
            valueJson: JSON.stringify(update.value),
            updatedBy: userId,
          },
          update: { valueJson: JSON.stringify(update.value), updatedBy: userId },
        });
      }
    });
  }

  async resetFeature(tenantId: string, featureKey: string): Promise<void> {
    await this.prisma.tenantFeatureOverride
      .delete({
        where: { tenantId_featureKey: { tenantId, featureKey } },
      })
      .catch(() => null); // Ignore if not found
  }

  private resolveDependencies(appId: string, visited = new Set<string>()): string[] {
    if (visited.has(appId)) {
      return [];
    }
    visited.add(appId);

    const def = this.featureCatalog.getAppEntitlementDefinition(appId);
    if (!def) {
      return [appId];
    }

    let deps = [appId];
    for (const dep of def.dependencies) {
      deps = [...deps, ...this.resolveDependencies(dep, visited)];
    }
    return deps;
  }

  private async findDependents(
    tenantId: string,
    appId: string,
    tx?: TransactionContext
  ): Promise<string[]> {
    const entitlements = await this.getEntitlements(tenantId, tx);
    const enabledApps = entitlements.apps.filter((a) => a.enabled);

    const dependents: string[] = [];
    for (const app of enabledApps) {
      if (app.appId === appId) {
        continue;
      }
      // Check if app depends on appId (direct or indirect)
      // This requires checking the dependency graph.
      // Simplified: check direct dependencies from manifest
      const def = this.featureCatalog.getAppEntitlementDefinition(app.appId);
      if (def && this.dependsOn(def.appId, appId)) {
        dependents.push(app.appId);
      }
    }
    return dependents;
  }

  private dependsOn(sourceAppId: string, targetAppId: string): boolean {
    const def = this.featureCatalog.getAppEntitlementDefinition(sourceAppId);
    if (!def) {
      return false;
    }
    if (def.dependencies.includes(targetAppId)) {
      return true;
    }
    // Recursive check
    for (const dep of def.dependencies) {
      if (this.dependsOn(dep, targetAppId)) {
        return true;
      }
    }
    return false;
  }
}
