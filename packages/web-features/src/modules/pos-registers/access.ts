import {
  hasPermission,
  useEffectivePermissions,
  useIsHostScope,
} from "@corely/web-shared/shared/lib/permissions";
import { useWorkspaceConfig } from "@corely/web-shared/shared/workspaces/workspace-config-provider";

const hasPosPermission = (
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

export const usePosRegisterPermissions = () => {
  const { hasCapability, isLoading: isConfigLoading } = useWorkspaceConfig();
  const rbacEnabled = hasCapability("workspace.rbac");
  const isHostScope = useIsHostScope();
  const permissionsQuery = useEffectivePermissions();

  return {
    isLoading: isConfigLoading || (rbacEnabled && permissionsQuery.isLoading),
    canReadRegisters: hasPosPermission(
      "pos.registers.read",
      rbacEnabled,
      isHostScope,
      permissionsQuery.data
    ),
    canManageRegisters: hasPosPermission(
      "pos.registers.manage",
      rbacEnabled,
      isHostScope,
      permissionsQuery.data
    ),
  };
};
