import { Injectable, Inject, ConflictException, NotFoundException } from "@nestjs/common";
import { PrismaService } from "@corely/data";
import { FeatureCatalogService } from "./feature-catalog.service";
import {
  AppEntitlementDefinition,
  FeatureDefinition,
  ResolvedAppEntitlement,
  ResolvedFeatureValue,
  TenantEntitlements,
} from "../domain/entitlement.types";

@Injectable()
export class TenantEntitlementsService {
  private cache = new Map<string, { data: TenantEntitlements; expiresAt: number }>();
  private CACHE_TTL_MS = 1000 * 60 * 5; // 5 minutes

  constructor(
    private readonly prisma: PrismaService,
    private readonly featureCatalog: FeatureCatalogService
  ) {}

  async getEntitlements(tenantId: string): Promise<TenantEntitlements> {
    const cached = this.cache.get(tenantId);
    if (cached && cached.expiresAt > Date.now()) {
      return cached.data;
    }

    const entitlements = await this.computeEntitlements(tenantId);
    this.cache.set(tenantId, { data: entitlements, expiresAt: Date.now() + this.CACHE_TTL_MS });
    return entitlements;
  }

  private async computeEntitlements(tenantId: string): Promise<TenantEntitlements> {
    // 1. Fetch overrides

    const overrides = await this.prisma.tenantFeatureOverride.findMany({
      where: { tenantId },
    });
    const overrideMap = new Map<string, any>(
      overrides.map((o) => [o.featureKey, JSON.parse(o.valueJson)])
    );

    // 2. Resolve Features
    const allFeatures = this.featureCatalog.getAllFeatures();
    const resolvedFeatures: ResolvedFeatureValue[] = [];

    for (const feat of allFeatures) {
      let value = feat.defaultValue;
      let source: any = "default";

      // TODO: Plan provider check here

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
    cascade: boolean = false
  ): Promise<void> {
    const appEntitlement = this.featureCatalog.getAppEntitlementDefinition(appId);
    if (!appEntitlement) {
      throw new NotFoundException(`App ${appId} not found`);
    }

    if (enabled) {
      // Enable: handle dependencies
      const toEnable = this.resolveDependencies(appId);

      // Write overrides
      await this.prisma.$transaction(async (tx) => {
        for (const depId of toEnable) {
          const depDef = this.featureCatalog.getAppEntitlementDefinition(depId);
          if (!depDef) {
            continue;
          }

          await tx.tenantFeatureOverride.upsert({
            where: { tenantId_featureKey: { tenantId, featureKey: depDef.enabledFeatureKey } },
            create: {
              tenantId,
              featureKey: depDef.enabledFeatureKey,
              valueJson: JSON.stringify(true),
              updatedBy: userId,
            },
            update: {
              valueJson: JSON.stringify(true),
              updatedBy: userId,
            },
          });
        }
      });
    } else {
      // Disable: Check dependents
      if (!cascade) {
        const dependents = await this.findDependents(tenantId, appId);
        if (dependents.length > 0) {
          throw new ConflictException(
            `Cannot disable ${appId} because the following enabled apps depend on it: ${dependents.join(", ")}`
          );
        }
      } else {
        // Recursive disable not fully implemented per prompt instructions for simplicity, but "findDependents" logic is needed
        // If cascade is true, we should probably disable dependents.
        // For now, let's just disable the target app as prompt says "support optional flag cascade=true to disable dependents too"
        const dependents = await this.findDependents(tenantId, appId);
        const toDisable = [appId, ...dependents];

        await this.prisma.$transaction(async (tx) => {
          for (const id of toDisable) {
            const def = this.featureCatalog.getAppEntitlementDefinition(id);
            if (!def) {
              continue;
            }

            await tx.tenantFeatureOverride.upsert({
              where: { tenantId_featureKey: { tenantId, featureKey: def.enabledFeatureKey } },
              create: {
                tenantId,
                featureKey: def.enabledFeatureKey,
                valueJson: JSON.stringify(false),
                updatedBy: userId,
              },
              update: { valueJson: JSON.stringify(false), updatedBy: userId },
            });
          }
        });
      }

      if (!cascade) {
        // If cascade was false and no dependents found

        await this.prisma.tenantFeatureOverride.upsert({
          where: {
            tenantId_featureKey: { tenantId, featureKey: appEntitlement.enabledFeatureKey },
          },
          create: {
            tenantId,
            featureKey: appEntitlement.enabledFeatureKey,
            valueJson: JSON.stringify(false),
            updatedBy: userId,
          },
          update: { valueJson: JSON.stringify(false), updatedBy: userId },
        });
      }
    }

    this.invalidateCache(tenantId);
  }

  async updateFeatures(
    tenantId: string,
    updates: { key: string; value: any }[],
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

    this.invalidateCache(tenantId);
  }

  async resetFeature(tenantId: string, featureKey: string): Promise<void> {
    await this.prisma.tenantFeatureOverride
      .delete({
        where: { tenantId_featureKey: { tenantId, featureKey } },
      })
      .catch(() => null); // Ignore if not found

    this.invalidateCache(tenantId);
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

  private async findDependents(tenantId: string, appId: string): Promise<string[]> {
    const entitlements = await this.getEntitlements(tenantId);
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

  invalidateCache(tenantId: string) {
    this.cache.delete(tenantId);
  }
}
