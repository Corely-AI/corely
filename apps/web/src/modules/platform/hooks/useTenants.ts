import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import type { ListTenantsOutput, PageInfo, TenantDto } from "@corely/contracts";
import { tenantsQueryKeys } from "./tenants.queryKeys";

export interface TenantsListParams {
  q?: string;
  page: number;
  pageSize: number;
  sort?: string;
  status?: TenantDto["status"];
}

export interface TenantsListResult {
  tenants: TenantDto[];
  pageInfo?: PageInfo;
}

export function useTenants(params: TenantsListParams) {
  return useQuery<TenantsListResult, Error>({
    queryKey: tenantsQueryKeys.list(params),
    queryFn: async () => {
      const query = new URLSearchParams();
      if (params.q) {
        query.set("q", params.q);
      }
      query.set("page", String(params.page));
      query.set("pageSize", String(params.pageSize));
      if (params.sort) {
        query.set("sort", params.sort);
      }
      if (params.status) {
        query.set("status", params.status);
      }

      const response = await apiClient.get<ListTenantsOutput | { tenants: TenantDto[] }>(
        `/platform/tenants?${query.toString()}`
      );

      if (Array.isArray((response as ListTenantsOutput).tenants)) {
        const parsed = response as ListTenantsOutput;
        return {
          tenants: parsed.tenants,
          pageInfo: parsed.pageInfo,
        };
      }
      if (Array.isArray((response as { tenants?: TenantDto[] }).tenants)) {
        return { tenants: (response as { tenants?: TenantDto[] }).tenants ?? [] };
      }
      return { tenants: [] };
    },
  });
}
