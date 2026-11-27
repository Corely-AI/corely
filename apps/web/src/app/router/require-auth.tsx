import React, { useEffect } from "react";
import { readWorkspaceHint } from "@corely/web-shared/session/workspace-launch";
import { Navigate, Outlet, useLocation } from "react-router-dom";
import { getTenantAdminSession } from "@corely/web-shared/lib/tenant-admin-session";
import { TenantAdminSessionBanner } from "../../modules/platform/screens/tenant-management/tenant-admin-session-banner";
import { useAuth } from "@/lib/auth-provider";
import { useWorkspace } from "@/shared/workspaces/workspace-provider";
import NotFound from "@corely/web-shared/shared/components/NotFound";
import { PageLoadingSkeleton } from "@corely/web-shared/shared/components/page-loading-skeleton";
import {
  getDefaultRouteForSurface,
  isRouteAllowedForSurface,
  useSurfaceId,
} from "@corely/web-shared/shared/surface";

export const RequireAuth: React.FC = () => {
  const { isAuthenticated, isLoading } = useAuth();
  const {
    workspaces,
    activeWorkspaceId,
    setWorkspace,
    isLoading: workspaceLoading,
    isInitialLoading: workspaceInitialLoading,
    isHostScope,
  } = useWorkspace();
  const location = useLocation();
  const surfaceId = useSurfaceId();
  const isOnboardingRoute = location.pathname === "/onboarding";
  const tenantAdminSession = getTenantAdminSession();
  const hint = readWorkspaceHint(location.search);
  const requestedId = hint.kind === "requested" ? hint.workspaceId : undefined;
  const authorizedHint =
    requestedId && workspaces.some((workspace) => workspace.id === requestedId);
  useEffect(() => {
    if (
      isAuthenticated &&
      !isLoading &&
      !workspaceLoading &&
      !isHostScope &&
      authorizedHint &&
      requestedId !== activeWorkspaceId
    ) {
      setWorkspace(requestedId);
    }
  }, [
    isAuthenticated,
    isLoading,
    workspaceLoading,
    isHostScope,
    authorizedHint,
    requestedId,
    activeWorkspaceId,
    setWorkspace,
  ]);

  // Workspace creation is tenant-scoped. Keep its draft mounted during background discovery.
  const canKeepOnboarding = isOnboardingRoute && hint.kind === "absent" && !tenantAdminSession;
  const waitingForWorkspace =
    workspaceInitialLoading ||
    (workspaceLoading &&
      !canKeepOnboarding &&
      (!workspaces.length || (requestedId && !authorizedHint)));
  if (isLoading || waitingForWorkspace) {
    return <PageLoadingSkeleton />;
  }

  if (!isAuthenticated && tenantAdminSession) {
    return <TenantAdminSessionBanner />;
  }
  if (!isAuthenticated) {
    return <Navigate to="/auth/login" state={{ from: location }} replace />;
  }
  // Block children until discovery validates and adopts the requested workspace.
  if (hint.kind === "invalid" || (requestedId && (!authorizedHint || isHostScope))) {
    return <NotFound />;
  }
  if (requestedId && requestedId !== activeWorkspaceId) {
    return <PageLoadingSkeleton />;
  }

  if (tenantAdminSession && workspaces.length === 0) {
    return <TenantAdminSessionBanner />;
  }
  if (!isOnboardingRoute && workspaces.length === 0 && !isHostScope) {
    return <Navigate to="/onboarding" state={{ from: location }} replace />;
  }

  if (isHostScope && location.pathname === "/dashboard") {
    return <Navigate to="/settings/tenants" replace />;
  }

  if (surfaceId !== "platform" && location.pathname === "/dashboard") {
    return <Navigate to={getDefaultRouteForSurface(surfaceId)} replace />;
  }

  if (!isRouteAllowedForSurface(surfaceId, location.pathname)) {
    return <NotFound />;
  }

  return <Outlet />;
};
