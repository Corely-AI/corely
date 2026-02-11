import { Injectable, Inject, ConflictException, NotFoundException } from "@nestjs/common";
import { PrismaService } from "@corely/data";
import { FeatureCatalogService } from "./feature-catalog.service";
import {
  AppPolicyForced,
  AppVisibilityBlocker,
  ResolvedAppEntitlement,
  ResolvedFeatureValue,
  TenantEntitlements,
  EffectiveAppState as DomainEffectiveAppState,
} from "../domain/entitlement.types";
import type {
  EffectiveAppsResponse,
  EffectiveAppState,
  UpdateAppPolicyInput,
  UpdateTenantAppSettingInput,
} from "@corely/contracts";
import {
  APP_REGISTRY_TOKEN,
  type AppRegistryPort,
} from "../../platform/application/ports/app-registry.port";
import { isSystemAppId } from "../../platform/system-apps";

const HOST_ALLOWED_KEY = (appId: string) => `app.${appId}.host.allowed`;
const HOST_FORCED_KEY = (appId: string) => `app.${appId}.host.forced`;
const TENANT_SETTING_KEY = (appId: string) => `app.${appId}.tenant.enabled`;
const LEGACY_ENABLEMENT_KEY = (appId: string) => `app.${appId}.enabled`;

const toBoolean = (value: unknown, fallback: boolean): boolean =>
  typeof value === "boolean" ? value : fallback;

const toForcedValue = (value: unknown): AppPolicyForced => {
  if (value === "on" || value === "off" || value === "none") {
    return value;
  }
  return "none";
};

@Injectable()
export class TenantEntitlementsService {
  private cache = new Map<string, { data: TenantEntitlements; expiresAt: number }>();
  private CACHE_TTL_MS = 1000 * 60 * 5; // 5 minutes

  constructor(
    private readonly prisma: PrismaService,
    private readonly featureCatalog: FeatureCatalogService,
    @Inject(APP_REGISTRY_TOKEN)
    private readonly appRegistry: AppRegistryPort
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

  async getEffectiveApps(tenantId: string): Promise<EffectiveAppsResponse> {
    const apps = await this.computeEffectiveApps(tenantId);
    return {
      apps,
      generatedAt: new Date().toISOString(),
    };
  }

  async updateAppPolicy(
    tenantId: string,
    appId: string,
    input: UpdateAppPolicyInput,
    userId: string
  ): Promise<void> {
    this.assertAppExists(appId);
    if (isSystemAppId(appId)) {
      throw new ConflictException({
        code: "SYSTEM_APP_LOCKED",
        message: `System app "${appId}" is always enabled and cannot be changed`,
      });
    }

    const existingOverrides = await this.readOverrideMap(tenantId);
    const currentAllowed = toBoolean(existingOverrides.get(HOST_ALLOWED_KEY(appId)), true);
    const nextForced = input.forced ?? toForcedValue(existingOverrides.get(HOST_FORCED_KEY(appId)));
    let nextAllowed = input.allowed ?? currentAllowed;

    if (nextForced === "on") {
      nextAllowed = true;
    }

    await this.prisma.$transaction(async (tx) => {
      if (input.allowed !== undefined || input.forced === "on") {
        await tx.tenantFeatureOverride.upsert({
          where: { tenantId_featureKey: { tenantId, featureKey: HOST_ALLOWED_KEY(appId) } },
          create: {
            tenantId,
            featureKey: HOST_ALLOWED_KEY(appId),
            valueJson: JSON.stringify(nextAllowed),
            updatedBy: userId,
          },
          update: {
            valueJson: JSON.stringify(nextAllowed),
            updatedBy: userId,
          },
        });
      }

      if (input.forced !== undefined) {
        await tx.tenantFeatureOverride.upsert({
          where: { tenantId_featureKey: { tenantId, featureKey: HOST_FORCED_KEY(appId) } },
          create: {
            tenantId,
            featureKey: HOST_FORCED_KEY(appId),
            valueJson: JSON.stringify(nextForced),
            updatedBy: userId,
          },
          update: {
            valueJson: JSON.stringify(nextForced),
            updatedBy: userId,
          },
        });
      }
    });

    this.invalidateCache(tenantId);
  }

  async updateTenantAppSetting(
    tenantId: string,
    appId: string,
    input: UpdateTenantAppSettingInput,
    userId: string
  ): Promise<void> {
    this.assertAppExists(appId);
    if (isSystemAppId(appId) && input.enabled === false) {
      throw new ConflictException({
        code: "SYSTEM_APP_LOCKED",
        message: `System app "${appId}" is always enabled and cannot be disabled`,
      });
    }

    const effectiveApps = await this.computeEffectiveApps(tenantId);
    const target = effectiveApps.find((app) => app.appId === appId);
    if (!target) {
      throw new NotFoundException(`App ${appId} not found`);
    }

    if (input.enabled) {
      const blockingReason = target.blockers.find((blocker) => blocker !== "TENANT_DISABLED");
      if (blockingReason) {
        const messageByBlocker: Record<AppVisibilityBlocker, string> = {
          PLATFORM_APP_DISABLED: "Platform app is not available",
          NOT_INSTALLED: "App is not installed for this tenant",
          INSTALL_DISABLED: "App install is disabled for this tenant",
          PLAN_NOT_ENTITLED: "This app is not entitled for this tenant",
          HOST_DENIED: "Host policy denies this app",
          HOST_FORCED_OFF: "Host policy forces this app off",
          TENANT_DISABLED: "App is disabled for this tenant",
        };
        throw new ConflictException({
          code: blockingReason,
          message: messageByBlocker[blockingReason],
        });
      }
    } else if (target.hostPolicy.forced === "on") {
      throw new ConflictException({
        code: "HOST_FORCED_ON",
        message: "Host policy forces this app on",
      });
    }

    await this.prisma.tenantFeatureOverride.upsert({
      where: { tenantId_featureKey: { tenantId, featureKey: TENANT_SETTING_KEY(appId) } },
      create: {
        tenantId,
        featureKey: TENANT_SETTING_KEY(appId),
        valueJson: JSON.stringify(input.enabled),
        updatedBy: userId,
      },
      update: {
        valueJson: JSON.stringify(input.enabled),
        updatedBy: userId,
      },
    });

    this.invalidateCache(tenantId);
  }

  private async computeEntitlements(tenantId: string): Promise<TenantEntitlements> {
    const overrideMap = await this.readOverrideMap(tenantId);

    // Resolve feature values (raw feature layer)
    const allFeatures = this.featureCatalog.getAllFeatures();
    const resolvedFeatures: ResolvedFeatureValue[] = [];

    for (const feat of allFeatures) {
      let value = feat.defaultValue;
      let source: "tenantOverride" | "default" = "default";

      if (overrideMap.has(feat.key)) {
        value = overrideMap.get(feat.key);
        source = "tenantOverride";
      }

      resolvedFeatures.push({ key: feat.key, value, source });
    }

    // Resolve apps from effective layer to keep one source of truth.
    const effectiveApps = await this.computeEffectiveApps(tenantId, overrideMap);
    const allApps = this.featureCatalog.getAllAppEntitlements();
    const appDefinitionMap = new Map(allApps.map((app) => [app.appId, app]));
    const resolvedApps: ResolvedAppEntitlement[] = effectiveApps.map((app) => {
      const definition = appDefinitionMap.get(app.appId);
      const source = app.planEntitlement.source === "override" ? "tenantOverride" : "default";
      return {
        appId: app.appId,
        enabled: app.effective.visible,
        source,
        dependencies: definition?.dependencies ?? [],
      };
    });

    return {
      apps: resolvedApps,
      features: resolvedFeatures,
      generatedAt: new Date().toISOString(),
    };
  }

  private async computeEffectiveApps(
    tenantId: string,
    existingOverrideMap?: Map<string, unknown>
  ): Promise<EffectiveAppState[]> {
    const overrideMap = existingOverrideMap ?? (await this.readOverrideMap(tenantId));
    const appEntitlements = this.featureCatalog.getAllAppEntitlements();
    const appManifests = this.appRegistry.list();
    const manifestById = new Map(appManifests.map((manifest) => [manifest.appId, manifest]));
    const installs = await this.prisma.tenantAppInstall.findMany({ where: { tenantId } });
    const installByAppId = new Map(installs.map((install) => [install.appId, install]));
    const hasPlatformApp = manifestById.has("platform");
    const platformAppEnabled = hasPlatformApp;

    const result: DomainEffectiveAppState[] = appEntitlements.map((definition) => {
      const manifest = manifestById.get(definition.appId);
      if (!manifest) {
        return {
          appId: definition.appId,
          name: definition.appId,
          tier: 99,
          isSystem: false,
          install: {
            installed: false,
            enabled: false,
          },
          planEntitlement: {
            enabled: false,
            source: "default",
          },
          hostPolicy: {
            allowed: false,
            forced: "none",
          },
          tenantSetting: {
            enabled: false,
            isEditable: false,
          },
          effective: {
            visible: false,
          },
          blockers: ["NOT_INSTALLED"],
        };
      }

      const isSystem = isSystemAppId(definition.appId);
      const installRecord = installByAppId.get(definition.appId);
      const installed = isSystem ? true : Boolean(installRecord);
      const installEnabled = isSystem ? true : Boolean(installRecord?.enabled);

      const legacyKey = LEGACY_ENABLEMENT_KEY(definition.appId);
      const hasLegacyOverride = overrideMap.has(legacyKey);
      const legacyValue = toBoolean(overrideMap.get(legacyKey), definition.defaultEnabled);
      const planEnabled = isSystem ? true : legacyValue;
      const planSource: "plan" | "default" | "override" = isSystem
        ? "default"
        : hasLegacyOverride
          ? "override"
          : "default";

      const hostAllowedKey = HOST_ALLOWED_KEY(definition.appId);
      const hostForcedKey = HOST_FORCED_KEY(definition.appId);
      const tenantSettingKey = TENANT_SETTING_KEY(definition.appId);

      // Migration behavior:
      // legacy app.<id>.enabled=false is treated as host deny until explicit host policy exists.
      const fallbackHostAllowed = hasLegacyOverride ? legacyValue : true;
      const hostAllowed = isSystem
        ? true
        : toBoolean(overrideMap.get(hostAllowedKey), fallbackHostAllowed);
      const hostForced = isSystem ? "on" : toForcedValue(overrideMap.get(hostForcedKey));

      const tenantEnabled = isSystem ? true : toBoolean(overrideMap.get(tenantSettingKey), true);
      const tenantEditable = isSystem
        ? false
        : hostAllowed && hostForced === "none" && planEnabled && installed && installEnabled;

      const blockers: AppVisibilityBlocker[] = [];
      if (!platformAppEnabled && definition.appId !== "platform") {
        blockers.push("PLATFORM_APP_DISABLED");
      }
      if (!installed) {
        blockers.push("NOT_INSTALLED");
      } else if (!installEnabled) {
        blockers.push("INSTALL_DISABLED");
      }
      if (!planEnabled) {
        blockers.push("PLAN_NOT_ENTITLED");
      }
      if (!hostAllowed) {
        blockers.push("HOST_DENIED");
      }
      if (hostForced === "off") {
        blockers.push("HOST_FORCED_OFF");
      }
      if (hostForced !== "on" && !tenantEnabled) {
        blockers.push("TENANT_DISABLED");
      }

      const visible = isSystem ? true : blockers.length === 0;
      const normalizedBlockers = isSystem ? [] : blockers;

      return {
        appId: definition.appId,
        name: manifest.name,
        tier: manifest.tier,
        isSystem,
        install: {
          installed: isSystem ? true : installed,
          enabled: isSystem ? true : installEnabled,
        },
        planEntitlement: {
          enabled: isSystem ? true : planEnabled,
          source: planSource,
        },
        hostPolicy: {
          allowed: isSystem ? true : hostAllowed,
          forced: isSystem ? "on" : hostForced,
        },
        tenantSetting: {
          enabled: isSystem ? true : tenantEnabled,
          isEditable: tenantEditable,
        },
        effective: {
          visible,
        },
        blockers: normalizedBlockers,
      };
    });

    return result
      .sort((a, b) => {
        if (a.tier !== b.tier) {
          return a.tier - b.tier;
        }
        const nameDiff = a.name.localeCompare(b.name, undefined, { sensitivity: "base" });
        if (nameDiff !== 0) {
          return nameDiff;
        }
        return a.appId.localeCompare(b.appId, undefined, { sensitivity: "base" });
      })
      .map((app) => app as EffectiveAppState);
  }

  private async readOverrideMap(tenantId: string): Promise<Map<string, unknown>> {
    const overrides = await this.prisma.tenantFeatureOverride.findMany({
      where: { tenantId },
    });
    return new Map<string, unknown>(
      overrides.map((override) => {
        try {
          return [override.featureKey, JSON.parse(override.valueJson)] as const;
        } catch {
          return [override.featureKey, override.valueJson] as const;
        }
      })
    );
  }

  private assertAppExists(appId: string): void {
    const appEntitlement = this.featureCatalog.getAppEntitlementDefinition(appId);
    if (!appEntitlement) {
      throw new NotFoundException(`App ${appId} not found`);
    }
  }

  async updateAppEnablement(
    tenantId: string,
    appId: string,
    enabled: boolean,
    userId: string,
    cascade: boolean = false
  ): Promise<void> {
    if (isSystemAppId(appId) && !enabled) {
      throw new ConflictException({
        code: "SYSTEM_APP_LOCKED",
        message: `System app "${appId}" is always enabled and cannot be disabled`,
      });
    }

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
