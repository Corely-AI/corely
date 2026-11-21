import "@corely/ui/focused-tokens.css";
import React from "react";
import { createRoot } from "react-dom/client";
import { createBrowserRouter, RouterProvider } from "react-router-dom";
import { WorkspaceSessionProviders } from "@corely/web-shared/session/workspace-session-provider";
import { AppCenter } from "./app-center";
import { useFocusedLocale } from "@corely/web-shared/session/use-focused-locale";
import "./index.css";

function AppCenterApplication() {
  const [locale, setLocale] = useFocusedLocale();
  return (
    <WorkspaceSessionProviders appKey="app-center" locale={locale}>
      <AppCenter locale={locale} onLocaleChange={setLocale} />
    </WorkspaceSessionProviders>
  );
}
const router = createBrowserRouter([
  {
    path: "*",
    element: <AppCenterApplication />,
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
