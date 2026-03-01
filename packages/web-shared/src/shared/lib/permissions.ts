import { useAuth } from "@corely/web-shared/lib/auth-provider";
import { useQuery } from "@tanstack/react-query";
import type { EffectivePermissionSet, EffectivePermissionsResponse } from "@corely/contracts";
import { identityApi } from "@corely/web-shared/lib/identity-api";

export const useIsHostScope = () => {
  const { user } = useAuth();
  return user?.activeTenantId === null;
};

export const isHostScope = (user: ReturnType<typeof useAuth>["user"]) =>
  user?.activeTenantId === null;

export const useEffectivePermissions = () => {
  const { user, isLoading: isAuthLoading } = useAuth();
  const scopeKey =
    user?.activeTenantId === null
      ? "host"
      : (user?.activeWorkspaceId ?? user?.activeTenantId ?? "none");
  return useQuery<EffectivePermissionsResponse>({
    queryKey: ["permissions", "effective", scopeKey],
    queryFn: () => identityApi.getEffectivePermissions(),
    enabled: Boolean(user) && !isAuthLoading,
    staleTime: 30_000,
  });
};

export const HOST_PLATFORM_PERMISSION_KEYS = new Set<string>([
  "platform.tenants.read",
  "platform.tenants.write",
  "platform.roles.read",
  "platform.roles.write",
  "platform.settings.read",
  "platform.settings.write",
  "platform.apps.manage",
  "platform.templates.apply",
  "platform.packs.install",
  "platform.tenants.entitlements.write",
  "platform.tenants.features.write",
]);

export const isHostScopedPlatformPermission = (key: string): boolean =>
  HOST_PLATFORM_PERMISSION_KEYS.has(key);

export const useActiveRoleId = () => {
  const { user } = useAuth();
  const activeTenantId = user?.activeWorkspaceId ?? user?.activeTenantId;
  const membership = user?.memberships?.find(
    (entry) => entry.tenantId === activeTenantId || entry.workspaceId === activeTenantId
  );

  return {
    roleId: membership?.roleId,
    activeTenantId,
  };
};

export const hasPermission = (
  permissions: EffectivePermissionSet | undefined,
  key: string
): boolean => {
  if (!permissions) {
    return false;
  }
  if (permissions.denied.includes(key)) {
    return false;
  }
  if (permissions.allowAll) {
    return true;
  }
  return permissions.allowed.includes(key);
};

export const useCanManageTenants = () => {
  const isHost = useIsHostScope();
  const { data, isLoading } = useEffectivePermissions();
  const can = isHost && hasPermission(data?.permissions, "platform.tenants.write");
  return { can, isLoading };
};

export const useCanReadTenants = () => {
  const isHost = useIsHostScope();
  const { data, isLoading } = useEffectivePermissions();
  const can = isHost && hasPermission(data?.permissions, "platform.tenants.read");
  return { can, isLoading };
};
