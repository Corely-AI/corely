import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { tenantsQueryKeys } from "./tenants.queryKeys";
import type { TenantDto, UpdateTenantInput } from "@corely/contracts";

export function useUpdateTenant() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ tenantId, input }: { tenantId: string; input: UpdateTenantInput }) => {
      const data = await apiClient.patch<TenantDto>(`/platform/tenants/${tenantId}`, input);
      return data;
    },
    onSuccess: (updatedTenant) => {
      queryClient.setQueryData(tenantsQueryKeys.all(), (old: TenantDto[] | undefined) => {
        if (!old) {return old;}
        return old.map((t) => (t.id === updatedTenant.id ? updatedTenant : t));
      });
      return queryClient.invalidateQueries({ queryKey: tenantsQueryKeys.list() });
    },
  });
}
