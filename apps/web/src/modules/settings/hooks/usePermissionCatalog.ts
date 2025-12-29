import { useQuery } from "@tanstack/react-query";
import { identityApi } from "@/lib/identity-api";
import { settingsQueryKeys } from "./settings.queryKeys";

export function usePermissionCatalog() {
  return useQuery({
    queryKey: settingsQueryKeys.permissionCatalog(),
    queryFn: () => identityApi.getPermissionCatalog(),
    staleTime: 60 * 1000,
  });
}
