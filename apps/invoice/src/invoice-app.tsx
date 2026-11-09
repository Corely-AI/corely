import React, { useMemo } from "react";
import {
  createBrowserRouter,
  RouterProvider,
  Outlet,
  Navigate,
  Link,
  useLocation,
} from "react-router-dom";
import { Toaster } from "sonner";
import { useTranslation } from "react-i18next";
import { AppLaunchOriginSchema, isSafeSsoReturnPath } from "@corely/contracts";
import { WorkspaceSessionProviders } from "@corely/web-shared/session/workspace-session-provider";
import { useWorkspaceSession } from "@corely/web-shared/session/workspace-session-context";
import { useSession } from "@corely/web-shared/session/session-context";
import { SessionFeatureHttpClient } from "@corely/web-shared/session/feature-http-client";
import { InvoicesApi } from "@corely/web-shared/lib/invoices-api";
import { createCustomersApi } from "@corely/web-shared/lib/customers-api";
import { PaymentMethodsApi } from "@corely/web-shared/lib/payment-methods-api";
import { FocusedAppShell } from "@corely/web-shared/layout/focused-app-shell";
import { invoicesRoutes } from "@corely/web-features/features/invoices";
import { InvoiceRuntimeProvider } from "@corely/web-features/modules/invoices";

function InvoiceLayout({ appCenterOrigin }: { appCenterOrigin: string }) {
  const { client } = useSession();
  const workspace = useWorkspaceSession();
  const location = useLocation();
  const { i18n } = useTranslation();
  const locale = i18n.language.startsWith("de")
    ? "de"
    : i18n.language.startsWith("vi")
      ? "vi"
      : "en";
  const runtime = useMemo(() => {
    const http = new SessionFeatureHttpClient(client);
    return {
      invoices: new InvoicesApi(http),
      customers: createCustomersApi(http),
      paymentMethods: new PaymentMethodsApi(http),
      scope: workspace.scope,
      workspace: workspace.workspace,
      registerDraft: workspace.registerDraft,
      route: (path: string) => {
        if (!isSafeSsoReturnPath(path)) {
          throw new Error("Invalid Invoice route");
        }
        const url = new URL(path, window.location.origin);
        url.searchParams.set("workspaceId", workspace.scope.workspaceId);
        return `${url.pathname}${url.search}${url.hash}`;
      },
    };
  }, [client, workspace.scope, workspace.workspace, workspace.registerDraft]);
  return (
    <InvoiceRuntimeProvider value={runtime}>
      <FocusedAppShell
        app="invoice"
        label="Invoice"
        routeRoots={["/invoices"]}
        appCenterOrigin={appCenterOrigin}
        workspace={workspace.workspace}
        workspaces={workspace.workspaces}
        onWorkspaceChange={workspace.selectWorkspace}
        actions={[
          {
            id: "new-invoice",
            label: "New invoice",
            route: "/invoices/new",
            menuItemId: "invoices",
          },
        ]}
        locale={locale}
      >
        <div key={location.pathname}>
          <Outlet />
        </div>
      </FocusedAppShell>
      <Toaster richColors />
    </InvoiceRuntimeProvider>
  );
}
function Landing() {
  const { search } = useLocation();
  return <Navigate to={`/invoices${search}`} replace />;
}
function NotFound() {
  const workspace = useWorkspaceSession();
  return (
    <section className="space-y-4" role="status">
      <h1 className="text-2xl font-semibold">Page not found</h1>
      <p>This page is not part of Invoice.</p>
      <Link to={`/invoices?workspaceId=${encodeURIComponent(workspace.scope.workspaceId)}`}>
        Back to invoices
      </Link>
    </section>
  );
}
export function InvoiceApp() {
  const environment = AppLaunchOriginSchema.safeParse(
    import.meta.env.VITE_CORELY_APP_CENTER_ORIGIN
  );
  const router = useMemo(
    () =>
      environment.success
        ? createBrowserRouter([
            {
              element: (
                <WorkspaceSessionProviders appKey="invoice" homePath="/invoices">
                  <InvoiceLayout appCenterOrigin={environment.data} />
                </WorkspaceSessionProviders>
              ),
              children: [
                { path: "/", element: <Landing /> },
                ...invoicesRoutes(),
                { path: "*", element: <NotFound /> },
              ],
            },
          ])
        : undefined,
    [environment.success ? environment.data : ""]
  );
  if (!router) {
    return (
      <main role="alert" className="p-6">
        Invoice is unavailable because its setup is incomplete. Please contact your workspace
        administrator.
      </main>
    );
  }
  return <RouterProvider router={router} />;
}
