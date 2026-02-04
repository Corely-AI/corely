import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import type { ListTenantsOutput, TenantDto } from "@corely/contracts";
import { tenantsQueryKeys } from "./tenants.queryKeys";

export function useTenants() {
  return useQuery<TenantDto[], Error>({
    queryKey: tenantsQueryKeys.list(),
    queryFn: async () => {
      const response = await apiClient.get<ListTenantsOutput | { tenants: TenantDto[] }>(
        "/platform/tenants"
      );
      if (Array.isArray((response as ListTenantsOutput).tenants)) {
        return (response as ListTenantsOutput).tenants;
      }
      if (Array.isArray((response as { tenants?: TenantDto[] }).tenants)) {
        return (response as { tenants?: TenantDto[] }).tenants ?? [];
      }
      return [];
    },
  });
}
