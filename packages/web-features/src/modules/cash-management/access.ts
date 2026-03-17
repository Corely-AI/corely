import {
  hasPermission,
  useEffectivePermissions,
  useIsHostScope,
} from "@corely/web-shared/shared/lib/permissions";
import { useWorkspaceConfig } from "@corely/web-shared/shared/workspaces/workspace-config-provider";

const hasCashPermission = (
  permission: string,
  rbacEnabled: boolean,
  isHostScope: boolean,
  permissions: ReturnType<typeof useEffectivePermissions>["data"] | undefined
) => {
  if (isHostScope) {
    return false;
  }

  if (!rbacEnabled) {
    return true;
  }

  return hasPermission(permissions?.permissions, permission);
};

export const useCashPermissions = () => {
  const { hasCapability, isLoading: isConfigLoading } = useWorkspaceConfig();
  const rbacEnabled = hasCapability("workspace.rbac");
  const isHostScope = useIsHostScope();
  const permissionsQuery = useEffectivePermissions();

  return {
    isLoading: isConfigLoading || (rbacEnabled && permissionsQuery.isLoading),
    canManageCash: hasCashPermission("cash.write", rbacEnabled, isHostScope, permissionsQuery.data),
    canCloseCash: hasCashPermission("cash.close", rbacEnabled, isHostScope, permissionsQuery.data),
    canExportCash: hasCashPermission(
      "cash.export",
      rbacEnabled,
      isHostScope,
      permissionsQuery.data
    ),
  };
};
