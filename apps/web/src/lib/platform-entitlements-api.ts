import { apiClient } from "./api-client";
import type {
  EffectiveAppsResponse,
  UpdateAppPolicyInput,
  UpdateTenantAppSettingInput,
} from "@corely/contracts";

export interface ResolvedFeatureValue {
  key: string;
  value: unknown;
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

  getEffectiveApps: async (tenantId: string) => {
    return apiClient.get<EffectiveAppsResponse>(`/platform/tenants/${tenantId}/apps/effective`);
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

  updateAppPolicy: async (tenantId: string, appId: string, input: UpdateAppPolicyInput) => {
    return apiClient.patch<{ success: boolean }>(
      `/platform/tenants/${tenantId}/apps/${appId}/policy`,
      input
    );
  },

  updateTenantAppSettingByHost: async (
    tenantId: string,
    appId: string,
    input: UpdateTenantAppSettingInput
  ) => {
    return apiClient.patch<{ success: boolean }>(
      `/platform/tenants/${tenantId}/apps/${appId}/setting`,
      input
    );
  },

  getCurrentTenantEffectiveApps: async () => {
    return apiClient.get<EffectiveAppsResponse>("/platform/apps/effective");
  },

  updateCurrentTenantAppSetting: async (appId: string, input: UpdateTenantAppSettingInput) => {
    return apiClient.patch<{ success: boolean }>(`/platform/apps/${appId}/setting`, input);
  },

  updateFeatures: async (tenantId: string, updates: { key: string; value: unknown }[]) => {
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
