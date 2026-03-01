import { apiClient } from "./api-client";
// Removed unused import

// Actually I defined types in Backend module. I should probably duplicate or share them.
// Prompt A1 says "Extend @corely/contracts".
// So I can use types from conflicts if I exported them there.
// I updated "contracts/src/platform/app-manifest.schema.ts" but didn't add TenantEntitlements types there in Part A1.
// Part A1 was "Extend AppManifest".
// Part B7 defines Response types.

export interface ResolvedFeatureValue {
  key: string;
  value: any;
  source: "tenantOverride" | "plan" | "default";
}

export interface ResolvedAppEntitlement {
  appId: string;
  enabled: boolean;
  source: "tenantOverride" | "plan" | "default";
  dependencies: string[];
}

export interface TenantEntitlementsResponse {
  apps: ResolvedAppEntitlement[];
  features: ResolvedFeatureValue[];
  generatedAt: string;
}

export const platformEntitlementsApi = {
  getEntitlements: async (tenantId: string) => {
    return apiClient.get<TenantEntitlementsResponse>(`/platform/tenants/${tenantId}/entitlements`);
  },

  updateAppEnablement: async (
    tenantId: string,
    appId: string,
    enabled: boolean,
    cascade: boolean = false
  ) => {
    return apiClient.patch<{ success: boolean }>(`/platform/tenants/${tenantId}/apps/${appId}`, {
      enabled,
      cascade,
    });
  },

  updateFeatures: async (tenantId: string, updates: { key: string; value: any }[]) => {
    return apiClient.put<{ success: boolean }>(`/platform/tenants/${tenantId}/features`, {
      updates,
    });
  },

  resetFeature: async (tenantId: string, featureKey: string) => {
    return apiClient.delete<{ success: boolean }>(
      `/platform/tenants/${tenantId}/features/${featureKey}`
    );
  },
};
