import { AppManifest } from "@corely/contracts";

export type FeatureType = "boolean" | "number" | "string" | "json";

export interface FeatureDefinition {
  key: string;
  type: FeatureType;
  defaultValue: unknown;
  title?: string;
  description?: string;
  category?: string;
  // Constraints
  min?: number;
  max?: number;
  enum?: string[];

  // Metadata
  tenantOverridable?: boolean;
  sourceAppId?: string; // which app defines this
}

export interface AppEntitlementDefinition {
  appId: string;
  enabledFeatureKey: string;
  defaultEnabled: boolean;
  dependencies: string[];
}

export type FeatureSource = "tenantOverride" | "plan" | "default";

export interface ResolvedFeatureValue {
  key: string;
  value: unknown;
  source: FeatureSource;
}

export interface ResolvedAppEntitlement {
  appId: string;
  enabled: boolean;
  source: FeatureSource;
  dependencies: string[];
}

export interface TenantEntitlements {
  apps: ResolvedAppEntitlement[];
  features: ResolvedFeatureValue[];
  generatedAt: string;
}
