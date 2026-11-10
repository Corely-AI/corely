import "@corely/ui/focused-tokens.css";
import React from "react";
import { createRoot } from "react-dom/client";
import { createBrowserRouter, RouterProvider } from "react-router-dom";
import { WorkspaceSessionProviders } from "@corely/web-shared/session/workspace-session-provider";
import { AppCenter } from "./app-center";
import { appCenterLocale } from "./copy";
import "./index.css";

const locale = appCenterLocale(navigator.language);
document.documentElement.lang = locale;
const router = createBrowserRouter([
  {
    path: "*",
    element: (
      <WorkspaceSessionProviders appKey="app-center" locale={locale}>
        <AppCenter locale={locale} />
      </WorkspaceSessionProviders>
    ),
  },
]);
document.documentElement.classList.add("corely-focused");
const root = document.getElementById("root");
if (!root) {
  throw new Error("Missing App Center root");
}
createRoot(root).render(
  <React.StrictMode>
    <RouterProvider router={router} />
  </React.StrictMode>
);
