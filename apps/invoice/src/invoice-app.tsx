import { observeFocused } from "@corely/web-shared/session/focused-observation";
import React, { useEffect, useMemo } from "react";
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
  const { t, i18n } = useTranslation();
  const locale = i18n.language.startsWith("de")
    ? "de"
    : i18n.language.startsWith("vi")
      ? "vi"
      : "en";
  const runtime = useMemo(() => {
    const http = new SessionFeatureHttpClient(client, "request");
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
        navigationLabels={{ "nav.invoices": t("nav.invoices") }}
        appCenterOrigin={appCenterOrigin}
        workspace={workspace.workspace}
        workspaces={workspace.workspaces}
        onWorkspaceChange={workspace.selectWorkspace}
        actions={[
          {
            id: "new-invoice",
            label: t("invoices.createInvoice"),
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
  const { t } = useTranslation();
  useEffect(
    () =>
      observeFocused({
        surface: "invoice",
        layer: "browser",
        event: "route-not-found",
        outcome: "rejected",
      }),
    []
  );
  const workspace = useWorkspaceSession();
  return (
    <section className="space-y-4" role="status">
      <h1 className="text-2xl font-semibold">{t("invoices.focused.notFound")}</h1>
      <p>{t("invoices.focused.notPart")}</p>
      <Link to={`/invoices?workspaceId=${encodeURIComponent(workspace.scope.workspaceId)}`}>
        {t("invoices.focused.back")}
      </Link>
    </section>
  );
}
function InvoiceEntry({ appCenterOrigin }: { appCenterOrigin: string }) {
  const { i18n } = useTranslation();
  const locale = i18n.language.startsWith("de")
    ? "de"
    : i18n.language.startsWith("vi")
      ? "vi"
      : "en";
  return (
    <WorkspaceSessionProviders appKey="invoice" homePath="/invoices" locale={locale}>
      <InvoiceLayout appCenterOrigin={appCenterOrigin} />
    </WorkspaceSessionProviders>
  );
}
export function InvoiceApp() {
  const { t } = useTranslation();
  const environment = AppLaunchOriginSchema.safeParse(
    import.meta.env.VITE_CORELY_APP_CENTER_ORIGIN
  );
  const router = useMemo(
    () =>
      environment.success
        ? createBrowserRouter([
            {
              element: <InvoiceEntry appCenterOrigin={environment.data} />,
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
        {t("invoices.focused.setup")}
      </main>
    );
  }
  return <RouterProvider router={router} />;
}
