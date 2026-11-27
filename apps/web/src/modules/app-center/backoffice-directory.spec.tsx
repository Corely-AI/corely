import React from "react";
import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter, Route, Routes, useLocation } from "react-router-dom";
import { afterEach, expect, it, vi } from "vitest";
import type { AppCatalogItem } from "@corely/contracts";
import { BackofficeDirectory } from "./backoffice-directory";

const request = vi.hoisted(() => vi.fn());
vi.mock("@corely/web-shared/lib/api-client", () => ({ apiClient: { request } }));
vi.mock("@corely/web-shared/lib/auth-provider", () => ({
  useAuth: () => ({ user: { userId: "user-a", activeTenantId: "tenant-a" } }),
}));
vi.mock("@corely/web-shared/shared/workspaces/workspace-provider", () => ({
  useWorkspace: () => ({ activeWorkspaceId: "workspace-a" }),
}));
vi.mock("@corely/web-shared/shared/workspaces/workspace-store", () => ({
  getActiveWorkspaceId: () => "workspace-a",
}));
vi.mock("react-i18next", () => ({ useTranslation: () => ({ i18n: { language: "en" } }) }));

const invoice: AppCatalogItem = {
  appId: "invoices",
  name: "Invoices",
  tier: 1,
  version: "1.0.0",
  dependencies: [],
  enabled: true,
  directory: {
    menuId: "invoices",
    category: "finance",
    displayName: { en: "Invoices", de: "Rechnungen", vi: "Hóa đơn" },
    path: "/invoices",
  },
};

function Destination() {
  const { pathname, search } = useLocation();
  return <output>{pathname + search}</output>;
}

function setup() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } });
  render(
    <QueryClientProvider client={client}>
      <MemoryRouter
        initialEntries={["/apps"]}
        future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
      >
        <Routes>
          <Route path="/apps" element={<BackofficeDirectory />} />
          <Route path="/invoices" element={<Destination />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>
  );
  return client;
}

afterEach(() => {
  cleanup();
  request.mockReset();
});

it("announces only catalog loading until the app cards arrive", async () => {
  let deliverCatalog!: (apps: AppCatalogItem[]) => void;
  const catalog = new Promise<AppCatalogItem[]>((resolve) => {
    deliverCatalog = resolve;
  });
  request.mockReturnValue(catalog);
  setup();

  expect(screen.getByRole("status")).toHaveTextContent("Loading apps…");
  expect(screen.getByRole("searchbox")).toBeEnabled();
  expect(screen.getByRole("combobox")).toBeEnabled();
  expect(screen.queryByRole("button", { name: "Open: Invoices" })).not.toBeInTheDocument();

  deliverCatalog([invoice]);

  expect(await screen.findByRole("button", { name: "Open: Invoices" })).toBeEnabled();
  expect(screen.queryByRole("status")).not.toBeInTheDocument();
});

it("opens the authorized relative route with the current workspace after refreshing the catalog", async () => {
  request.mockResolvedValue([invoice]);
  setup();

  fireEvent.click(await screen.findByRole("button", { name: "Open: Invoices" }));

  expect(await screen.findByText("/invoices?workspaceId=workspace-a")).toBeInTheDocument();
  expect(request).toHaveBeenCalledTimes(2);
});

it("ignores cached launch data when workspace switching cancels the refresh", async () => {
  request.mockResolvedValueOnce([invoice]).mockImplementationOnce(() => new Promise(() => {}));
  const client = setup();

  fireEvent.click(await screen.findByRole("button", { name: "Open: Invoices" }));
  await waitFor(() => expect(request).toHaveBeenCalledTimes(2));
  expect(screen.getByRole("button", { name: "Open: Invoices" })).toBeDisabled();
  expect(screen.getByRole("status")).toHaveTextContent("Checking access…");

  await act(async () => {
    await client.cancelQueries();
  });

  expect(screen.getByRole("button", { name: "Open: Invoices" })).toBeInTheDocument();
  expect(screen.queryByText("/invoices?workspaceId=workspace-a")).not.toBeInTheDocument();
  expect(screen.queryByRole("alert")).not.toBeInTheDocument();
});
