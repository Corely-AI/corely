import { useQuery } from "@tanstack/react-query";
import { identityApi } from "@/lib/identity-api";
import { settingsQueryKeys } from "./settings.queryKeys";

export function useRolePermissions(roleId: string | undefined) {
  return useQuery({
    queryKey: settingsQueryKeys.roles.permissions(roleId || ""),
    queryFn: () => identityApi.getRolePermissions(roleId || ""),
    enabled: !!roleId,
    staleTime: 30 * 1000,
  });
}
