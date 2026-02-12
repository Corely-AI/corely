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
    onSuccess: () => {
      return queryClient.invalidateQueries({ queryKey: tenantsQueryKeys.list() });
    },
  });
}
