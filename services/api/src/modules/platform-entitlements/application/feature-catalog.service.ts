import { Inject, Injectable, OnApplicationBootstrap, OnModuleInit } from "@nestjs/common";
import {
  APP_REGISTRY_TOKEN,
  type AppRegistryPort,
} from "../../platform/application/ports/app-registry.port";
import { FeatureDefinition, AppEntitlementDefinition } from "../domain/entitlement.types";
import { AppManifest } from "@corely/contracts";

@Injectable()
export class FeatureCatalogService implements OnModuleInit, OnApplicationBootstrap {
  private _features: Map<string, FeatureDefinition> = new Map();
  private _appEntitlements: Map<string, AppEntitlementDefinition> = new Map();
  private _appFeatures: Map<string, string[]> = new Map(); // appId -> feature keys

  constructor(
    @Inject(APP_REGISTRY_TOKEN)
    private readonly appRegistry: AppRegistryPort
  ) {}

  onModuleInit() {
    this.compileCatalog();
  }

  onApplicationBootstrap() {
    // PlatformModule loads manifests in its onModuleInit; recompile once more
    // after bootstrap so entitlement catalog sees the fully loaded registry.
    this.compileCatalog();
  }

  public compileCatalog() {
    this._features.clear();
    this._appEntitlements.clear();
    this._appFeatures.clear();

    const manifests = this.appRegistry.list();

    for (const app of manifests) {
      this.processAppManifest(app);
    }
  }

  private processAppManifest(app: AppManifest) {
    // 1. Process explicit features

    const appAny = app as any;
    const appFeatureKeys: string[] = [];
    if (appAny.features) {
      for (const feat of appAny.features) {
        const def: FeatureDefinition = {
          key: feat.key,
          type: feat.type,
          defaultValue: feat.defaultValue,
          title: feat.title,
          description: feat.description,
          category: feat.category,
          min: feat.constraints?.min,
          max: feat.constraints?.max,
          enum: feat.constraints?.enum,
          tenantOverridable: feat.tenantOverridable ?? true,
          sourceAppId: app.appId,
        };
        this._features.set(feat.key, def);
        appFeatureKeys.push(feat.key);
      }
    }

    // 2. Process Entitlement (Derived App Enablement Feature)

    const enabledKey = appAny.entitlement?.enabledFeatureKey ?? `app.${app.appId}.enabled`;
    const defaultEnabled =
      appAny.entitlement?.defaultEnabled ?? ["core", "platform"].includes(app.appId);

    // Register the enablement feature
    const enablementFeature: FeatureDefinition = {
      key: enabledKey,
      type: "boolean",
      defaultValue: defaultEnabled,
      title: `${app.name} Enabled`,
      description: `Enable ${app.name} app for tenant`,
      category: "entitlement",
      tenantOverridable: true,
      sourceAppId: app.appId,
    };
    this._features.set(enabledKey, enablementFeature);
    appFeatureKeys.push(enabledKey);

    this._appFeatures.set(app.appId, appFeatureKeys);

    // Register App Entitlement Definition
    const entDef: AppEntitlementDefinition = {
      appId: app.appId,
      enabledFeatureKey: enabledKey,
      defaultEnabled,
      dependencies: app.dependencies || [],
    };
    this._appEntitlements.set(app.appId, entDef);
  }

  getFeatureDefinition(key: string): FeatureDefinition | undefined {
    return this._features.get(key);
  }

  getAppEntitlementDefinition(appId: string): AppEntitlementDefinition | undefined {
    return this._appEntitlements.get(appId);
  }

  getAllFeatures(): FeatureDefinition[] {
    return Array.from(this._features.values());
  }

  getAllAppEntitlements(): AppEntitlementDefinition[] {
    return Array.from(this._appEntitlements.values());
  }
}
