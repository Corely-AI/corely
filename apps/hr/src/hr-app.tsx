import { useMemo } from "react";
import {
  createBrowserRouter,
  RouterProvider,
  Outlet,
  Navigate,
  useLocation,
} from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useQuery } from "@tanstack/react-query";
import {
  AppLaunchOriginSchema,
  EffectivePermissionsResponseSchema,
  isSafeSsoReturnPath,
} from "@corely/contracts";
import { WorkspaceSessionProviders } from "@corely/web-shared/session/workspace-session-provider";
import { useWorkspaceSession } from "@corely/web-shared/session/workspace-session-context";
import { useSession } from "@corely/web-shared/session/session-context";
import { SessionFeatureHttpClient } from "@corely/web-shared/session/feature-http-client";
import { sessionScopeQueryKey } from "@corely/web-shared/session/workspace-launch";
import { FocusedAppShell } from "@corely/web-shared/layout/focused-app-shell";
import {
  PeopleDirectoryPage,
  StaffProfilePage,
  StaffJourneyPage,
  PeopleRuntimeProvider,
  createPeopleApi,
  createStaffJourneyClient,
} from "@corely/web-features/modules/people";

function HrLayout({ appCenterOrigin }: { appCenterOrigin: string }) {
  const { client } = useSession();
  const workspace = useWorkspaceSession();
  const { pathname } = useLocation();
  const { t, i18n } = useTranslation();
  const locale = i18n.language.startsWith("de")
    ? "de"
    : i18n.language.startsWith("vi")
      ? "vi"
      : "en";
  const permissions = useQuery({
    queryKey: sessionScopeQueryKey(workspace.scope, "people-permissions"),
    queryFn: ({ signal }) =>
      client.json("/identity/permissions/effective", EffectivePermissionsResponseSchema, {
        signal,
      }),
    retry: false,
    refetchOnWindowFocus: "always",
  });
  const runtime = useMemo(() => {
    const http = new SessionFeatureHttpClient(client, "request");
    return {
      api: createPeopleApi(http, () => workspace.scope.workspaceId, true),
      journey: createStaffJourneyClient(http, workspace.scope.workspaceId, true),
      scope: workspace.scope,
      permissions: permissions.data?.permissions ?? { allowAll: false, allowed: [], denied: [] },
      route: (path: string) => {
        if (!isSafeSsoReturnPath(path) || !/^\/people(?:\/|$)/.test(path)) {
          throw new Error("Invalid HR route");
        }
        const url = new URL(path, window.location.origin);
        url.searchParams.set("workspaceId", workspace.scope.workspaceId);
        return `${url.pathname}${url.search}${url.hash}`;
      },
    };
  }, [
    client,
    workspace.scope.userId,
    workspace.scope.tenantId,
    workspace.scope.workspaceId,
    workspace.scope.appKey,
    permissions.data,
  ]);
  return (
    <FocusedAppShell
      app="hr"
      label="HR"
      routeRoots={["/people"]}
      appCenterOrigin={appCenterOrigin}
      workspace={workspace.workspace}
      workspaces={workspace.workspaces}
      onWorkspaceChange={workspace.selectWorkspace}
      navigationLabels={{
        "nav.people": t("nav.people"),
        "nav.peopleSelfService": t("nav.peopleSelfService"),
      }}
      locale={locale}
    >
      {permissions.isPending ? (
        <p role="status">Loading permissions…</p>
      ) : permissions.isError ? (
        <p role="alert">HR access could not be verified. Refresh to try again.</p>
      ) : (
        <PeopleRuntimeProvider value={runtime}>
          <div key={pathname}>
            <Outlet />
          </div>
        </PeopleRuntimeProvider>
      )}
    </FocusedAppShell>
  );
}
function Landing() {
  const { search } = useLocation();
  return <Navigate to={`/people/staff${search}`} replace />;
}
function NotFound() {
  return (
    <section role="status">
      <h1 className="text-2xl font-semibold">Page not found</h1>
      <p>This page is not part of HR.</p>
    </section>
  );
}
export function HrApp() {
  const environment = AppLaunchOriginSchema.safeParse(
    import.meta.env.VITE_CORELY_APP_CENTER_ORIGIN
  );
  const router = useMemo(
    () =>
      environment.success
        ? createBrowserRouter([
            {
              element: (
                <WorkspaceSessionProviders appKey="hr" homePath="/people/staff">
                  <HrLayout appCenterOrigin={environment.data} />
                </WorkspaceSessionProviders>
              ),
              children: [
                { path: "/", element: <Landing /> },
                { path: "/people/staff", element: <PeopleDirectoryPage /> },
                { path: "/people/staff/new", element: <StaffProfilePage /> },
                { path: "/people/staff/:id", element: <StaffProfilePage /> },
                { path: "/people/staff/:id/edit", element: <StaffProfilePage /> },
                { path: "/people/staff/:id/lifecycle", element: <StaffJourneyPage manager /> },
                { path: "/people/me", element: <StaffJourneyPage /> },
                { path: "*", element: <NotFound /> },
              ],
            },
          ])
        : undefined,
    [environment.success ? environment.data : ""]
  );
  return router ? (
    <RouterProvider router={router} />
  ) : (
    <main role="alert" className="p-6">
      HR is unavailable because its setup is incomplete. Please contact your workspace
      administrator.
    </main>
  );
}
