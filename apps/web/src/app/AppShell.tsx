import React from "react";
import { AppShell as SharedAppShell } from "@corely/web-shared";
import { AppSidebar } from "./AppSidebar";
import { useLocation } from "react-router-dom";
import { ExpensesShell } from "./expenses-shell";

export function AppShell() {
  const { pathname } = useLocation();
  if (pathname === "/expenses" || pathname.startsWith("/expenses/")) {
    return <ExpensesShell />;
  }
  return <SharedAppShell renderSidebar={(props) => <AppSidebar {...props} />} />;
}
