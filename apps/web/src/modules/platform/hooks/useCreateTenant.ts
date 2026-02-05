import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import type { CreateTenantInput, CreateTenantResponse } from "@corely/contracts";
import { tenantsQueryKeys } from "./tenants.queryKeys";

export function useCreateTenant() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CreateTenantInput) => {
      return apiClient.post<CreateTenantResponse>("/platform/tenants", input, {
        idempotencyKey: apiClient.generateIdempotencyKey(),
      });
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: tenantsQueryKeys.list() });
    },
  });
}
