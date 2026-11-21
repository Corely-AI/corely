import React, { Suspense, lazy } from "react";
import { BrowserRouter, Navigate, Outlet, Route, Routes, useMatch } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useWorkspace } from "@corely/web-shared/shared/workspaces/workspace-provider";
import { AppShell } from "@corely/web-shared/layout/app-shell";
import { Button, EmptyState } from "@corely/ui";
import { RequireAuth } from "./require-auth";
import { LoginPage } from "../routes/auth/login";

const Overview = lazy(() => import("@corely/web-features/modules/sign/overview-page"));
const Templates = lazy(() => import("@corely/web-features/modules/sign/template-page"));
const Requests = lazy(() => import("@corely/web-features/modules/sign/request-page"));
const signMenu = {
  id: "sign",
  labelKey: "Corely Sign",
  defaultLabel: "Corely Sign",
  order: 1,
  items: [
    {
      id: "sign-home",
      label: "Overview",
      labelKey: "sign.overview",
      route: "/sign",
      icon: "LayoutDashboard",
    },
    {
      id: "sign-prepare",
      label: "Prepare a request",
      labelKey: "sign.prepareRequest",
      route: "/sign/requests/new",
      icon: "FileSignature",
    },
    {
      id: "sign-requests",
      label: "My signing requests",
      labelKey: "sign.requests",
      route: "/sign/requests",
      icon: "ClipboardList",
    },
    {
      id: "sign-templates",
      label: "Signing templates",
      labelKey: "sign.templates",
      route: "/sign/templates",
      icon: "FileStack",
    },
    {
      id: "sign-settings",
      label: "Signing settings",
      labelKey: "sign.settings",
      route: "/sign/settings",
      icon: "Settings",
    },
  ],
};

function SignShell() {
  const preparing = Boolean(useMatch("/sign/requests/new"));
  const navigation = React.useMemo(
    () => [
      {
        ...signMenu,
        items: signMenu.items.map((item, order) => ({
          ...item,
          section: "sign",
          order,
          exact: item.id === "sign-home" || (item.id === "sign-requests" && preparing),
        })),
      },
    ],
    [preparing]
  );
  return (
    <AppShell
      navigationGroups={navigation}
      includeWorkspaceQuickActions={false}
      sidebarProps={{
        showPlatformAdminNav: false,
        showWorkspaceTypeBadge: false,
        allowWorkspaceCreation: false,
      }}
    />
  );
}

function WorkspaceContent() {
  const { t } = useTranslation();
  const { activeWorkspace, isLoading, refresh } = useWorkspace();
  const loading = (
    <p role="status" className="p-6 text-muted-foreground">
      {t("common.loading")}
    </p>
  );
  if (!activeWorkspace) {
    if (isLoading) return loading;
    return (
      <EmptyState
        title={t("sign.workspaceRequired")}
        action={
          <Button variant="outline" onClick={() => void refresh()}>
            {t("sign.retry")}
          </Button>
        }
      />
    );
  }
  return (
    <Suspense fallback={loading}>
      <Outlet />
    </Suspense>
  );
}
export function Router() {
  const enabled =
    import.meta.env.DEV ||
    /^\/source\/corely-sign-[a-f0-9]{40}\.zip$/.test(import.meta.env.VITE_SIGN_SOURCE_URL ?? "");
  if (!enabled) return <main className="p-6">Corely Sign is unavailable on this host.</main>;
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Navigate to="/sign" replace />} />
        <Route path="/auth/login" element={<LoginPage />} />
        <Route element={<RequireAuth />}>
          <Route element={<SignShell />}>
            <Route element={<WorkspaceContent />}>
              <Route path="/sign" element={<Overview focused />} />
              <Route path="/sign/settings" element={<Overview focused />} />
              <Route path="/sign/requests" element={<Requests />} />
              <Route path="/sign/requests/:id" element={<Requests />} />
              {[
                "/sign/templates",
                "/sign/templates/new",
                "/sign/templates/:id",
                "/sign/templates/:id/edit",
                "/sign/requests/new",
              ].map((path) => (
                <Route key={path} path={path} element={<Templates />} />
              ))}
            </Route>
          </Route>
        </Route>
        <Route path="*" element={<Navigate to="/sign" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
