import React from "react";
import { AppShell as SharedAppShell } from "@corely/web-shared";
import { TenantAdminSessionBanner } from "../modules/platform/screens/tenant-management/tenant-admin-session-banner";
import { AppSidebar } from "./AppSidebar";

export function AppShell() {
  return (
    <SharedAppShell
      topContent={<TenantAdminSessionBanner />}
      renderSidebar={(props) => <AppSidebar {...props} />}
    />
  );
}
