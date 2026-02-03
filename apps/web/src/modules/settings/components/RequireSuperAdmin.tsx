import React from "react";
import NotFound from "@/shared/components/NotFound";
import { useAuth } from "@/lib/auth-provider";

interface RequireSuperAdminProps {
  children: React.ReactNode;
}

export const RequireSuperAdmin: React.FC<RequireSuperAdminProps> = ({ children }) => {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return null;
  }

  const isSuperAdmin = user?.memberships?.some((membership) => membership.tenantId === "host");
  if (!isSuperAdmin) {
    return <NotFound />;
  }

  return <>{children}</>;
};
