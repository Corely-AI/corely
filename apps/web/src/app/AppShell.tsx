import React from "react";
import { AppShell as SharedAppShell } from "@corely/web-shared";
import { AppSidebar } from "./AppSidebar";

export function AppShell() {
  return <SharedAppShell renderSidebar={(props) => <AppSidebar {...props} />} />;
}
