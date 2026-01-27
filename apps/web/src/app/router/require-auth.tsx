import React from "react";
import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "@/lib/auth-provider";
import { useWorkspace } from "@/shared/workspaces/workspace-provider";

import { features } from "@/lib/features";

export const RequireAuth: React.FC = () => {
  const { isAuthenticated, isLoading } = useAuth();
  const { workspaces, isLoading: workspaceLoading } = useWorkspace();
  const location = useLocation();

  if (isLoading || workspaceLoading) {
    return null;
  }

  if (!isAuthenticated) {
    return <Navigate to="/auth/login" state={{ from: location }} replace />;
  }

  // OSS mode: workspace auto-created on signup, no onboarding needed
  // EE mode: redirect to onboarding if no workspaces
  if (features.multiTenant) {
    const isOnboardingRoute = location.pathname.startsWith("/onboarding");
    if (!isOnboardingRoute && workspaces.length === 0) {
      return <Navigate to="/onboarding" state={{ from: location }} replace />;
    }
  }

  return <Outlet />;
};
