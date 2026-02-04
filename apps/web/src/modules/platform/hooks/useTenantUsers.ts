import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import type {
  CreateTenantUserInput,
  CreateTenantUserResponse,
  ListTenantUsersOutput,
  UpdateTenantUserRoleResponse,
} from "@corely/contracts";

export const tenantUsersQueryKey = (tenantId: string) => ["tenants", "users", tenantId] as const;

export const useTenantUsers = (tenantId?: string) => {
  return useQuery<ListTenantUsersOutput>({
    queryKey: tenantId ? tenantUsersQueryKey(tenantId) : ["tenants", "users", "none"],
    enabled: Boolean(tenantId),
    queryFn: async () => {
      return apiClient.get<ListTenantUsersOutput>(`/platform/tenants/${tenantId}/users`);
    },
  });
};

export const useCreateTenantUser = (tenantId: string) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: CreateTenantUserInput) => {
      return apiClient.post<CreateTenantUserResponse>(
        `/platform/tenants/${tenantId}/users`,
        input,
        {
          idempotencyKey: apiClient.generateIdempotencyKey(),
        }
      );
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: tenantUsersQueryKey(tenantId) });
    },
  });
};

export const useUpdateTenantUserRole = (tenantId: string) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: { membershipId: string; roleId: string }) => {
      return apiClient.patch<UpdateTenantUserRoleResponse>(
        `/platform/tenants/${tenantId}/users/${input.membershipId}/role`,
        { roleId: input.roleId }
      );
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: tenantUsersQueryKey(tenantId) });
    },
  });
};
