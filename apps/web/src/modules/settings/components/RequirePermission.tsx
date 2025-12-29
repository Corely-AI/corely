import React from "react";
import NotFound from "@/shared/components/NotFound";
import { hasPermission, useActiveRoleId } from "@/shared/lib/permissions";
import { useRolePermissions } from "../hooks/useRolePermissions";

interface RequirePermissionProps {
  permission: string;
  children: React.ReactNode;
}

export const RequirePermission: React.FC<RequirePermissionProps> = ({ permission, children }) => {
  const { roleId } = useActiveRoleId();
  const { data, isLoading } = useRolePermissions(roleId);

  if (isLoading) {
    return null;
  }

  if (!roleId) {
    return <NotFound />;
  }

  if (!hasPermission(data?.grants, permission)) {
    return <NotFound />;
  }

  return <>{children}</>;
};
