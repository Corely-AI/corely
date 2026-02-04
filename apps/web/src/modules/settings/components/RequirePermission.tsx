import React from "react";
import NotFound from "@/shared/components/NotFound";
import {
  hasPermission,
  isHostScopedPlatformPermission,
  useEffectivePermissions,
  useIsHostScope,
} from "@/shared/lib/permissions";
import { useWorkspaceConfig } from "@/shared/workspaces/workspace-config-provider";

interface RequirePermissionProps {
  permission: string;
  children: React.ReactNode;
}

export const RequirePermission: React.FC<RequirePermissionProps> = ({ permission, children }) => {
  const { hasCapability, isLoading: isConfigLoading } = useWorkspaceConfig();
  const rbacEnabled = hasCapability("workspace.rbac");
  const isHostScope = useIsHostScope();
  const { data, isLoading } = useEffectivePermissions();
  const isPlatformPermission = isHostScopedPlatformPermission(permission);

  if (isPlatformPermission) {
    if (!isHostScope) {
      return <NotFound />;
    }
    if (isLoading) {
      return null;
    }
    if (!hasPermission(data?.permissions, permission)) {
      return <NotFound />;
    }
    return <>{children}</>;
  }

  if (isHostScope) {
    return <NotFound />;
  }

  if (isConfigLoading) {
    return null;
  }

  if (!rbacEnabled) {
    return <>{children}</>;
  }

  if (isLoading) {
    return null;
  }

  if (!hasPermission(data?.permissions, permission)) {
    return <NotFound />;
  }

  return <>{children}</>;
};
