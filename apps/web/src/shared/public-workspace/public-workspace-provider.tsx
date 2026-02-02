import React, { createContext, useContext, useEffect, useMemo } from "react";
import { Outlet, useLocation, useNavigate, useParams } from "react-router-dom";
import { setPublicWorkspaceSlug } from "./public-workspace-store";

export type PublicWorkspaceContextValue = {
  workspaceSlug: string | null;
};

const PublicWorkspaceContext = createContext<PublicWorkspaceContextValue>({
  workspaceSlug: null,
});

const mapLegacyPath = (pathname: string): string => {
  if (pathname === "/stay") {
    return "/rental";
  }
  if (pathname.startsWith("/stay/")) {
    return pathname.replace("/stay", "/rental");
  }
  if (pathname === "/p") {
    return "/cms";
  }
  if (pathname.startsWith("/p/")) {
    return pathname.replace("/p", "/cms");
  }
  return pathname;
};

export const PublicWorkspaceProvider = () => {
  const params = useParams<{ workspaceSlug?: string }>();
  const location = useLocation();
  const navigate = useNavigate();

  const queryParams = useMemo(() => new URLSearchParams(location.search), [location.search]);
  const queryWorkspace = queryParams.get("w");
  const workspaceSlug = params.workspaceSlug ?? queryWorkspace ?? null;

  useEffect(() => {
    setPublicWorkspaceSlug(workspaceSlug ?? null);
    return () => setPublicWorkspaceSlug(null);
  }, [workspaceSlug]);

  useEffect(() => {
    // Simplified: always redirect to canonical path structure
    if (params.workspaceSlug || !queryWorkspace) {
      return;
    }

    const mappedPath = mapLegacyPath(location.pathname);
    const nextPath = `/w/${queryWorkspace}${mappedPath}`;
    const nextParams = new URLSearchParams(location.search);
    nextParams.delete("w");
    const nextSearch = nextParams.toString();
    navigate(nextSearch ? `${nextPath}?${nextSearch}` : nextPath, { replace: true });
  }, [location.pathname, location.search, navigate, params.workspaceSlug, queryWorkspace]);

  const value = useMemo(
    () => ({
      workspaceSlug: workspaceSlug ?? null,
    }),
    [workspaceSlug]
  );

  return (
    <PublicWorkspaceContext.Provider value={value}>
      <Outlet />
    </PublicWorkspaceContext.Provider>
  );
};

export const usePublicWorkspace = () => useContext(PublicWorkspaceContext);
