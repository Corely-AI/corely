import React, { useState } from "react";
import { afterEach, expect, it, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { focusManager, QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { WorkspaceDto } from "@corely/contracts";
import { AppShell } from "@corely/web-shared/layout/app-shell";
import { WorkspaceProvider } from "@corely/web-shared/shared/workspaces/workspace-provider";
import { setActiveWorkspaceId } from "@corely/web-shared/shared/workspaces/workspace-store";
import { WorkspaceOnboardingPage } from "../../modules/workspaces/screens/WorkspaceOnboardingPage";
import { RequireAuth } from "./require-auth";

const fixture = vi.hoisted(() => ({ list: vi.fn(), create: vi.fn() }));
vi.mock("@corely/web-shared/lib/auth-provider", () => ({
  useAuth: () => ({
    isAuthenticated: true,
    isLoading: false,
    user: { activeTenantId: "tenant-a" },
  }),
}));
vi.mock("@corely/web-shared/shared/workspaces/workspaces-api", () => ({
  workspacesApi: { listWorkspaces: fixture.list, createWorkspace: fixture.create },
}));
vi.mock("@corely/web-shared/layout/app-sidebar", () => ({ AppSidebar: () => null }));
vi.mock("@corely/web-shared/shared/workspaces/workspace-config-provider", () => ({
  useWorkspaceConfig: () => ({ config: null, navigationGroups: [], isLoading: false, error: null }),
}));
const workspace: WorkspaceDto = {
  id: "workspace-new",
  name: "Synthetic",
  legalEntityId: "legal",
  kind: "PERSONAL",
  onboardingStatus: "NEW",
  createdAt: "2026-11-07T00:00:00Z",
  updatedAt: "2026-11-07T00:00:00Z",
};
let client: QueryClient;
afterEach(() => {
  cleanup();
  client.clear();
  focusManager.setFocused(undefined);
  setActiveWorkspaceId(null);
  fixture.list.mockReset();
  fixture.create.mockReset();
  window.history.replaceState({}, "", "/");
});
function PublicJourney() {
  const [draft, setDraft] = useState("");
  return (
    <input
      aria-label="Public booking draft"
      value={draft}
      onChange={(event) => setDraft(event.target.value)}
    />
  );
}
function renderApp(path: string) {
  window.history.replaceState({}, "", path);
  client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  client.setQueryData(["workspaces", "tenant-a"], []);
  render(
    <QueryClientProvider client={client}>
      <WorkspaceProvider>
        <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
          <Routes>
            <Route path="/public-booking" element={<PublicJourney />} />
            <Route element={<RequireAuth />}>
              <Route
                element={
                  <AppShell
                    navigationGroups={[]}
                    includeWorkspaceQuickActions={false}
                    renderSidebar={() => null}
                  />
                }
              >
                <Route path="/onboarding" element={<WorkspaceOnboardingPage />} />
                <Route path="/dashboard" element={<h1>Dashboard reached</h1>} />
              </Route>
            </Route>
          </Routes>
        </BrowserRouter>
      </WorkspaceProvider>
    </QueryClientProvider>
  );
}

it("preserves step two and its draft during a workspace refetch on tab return", async () => {
  let finish: (value: WorkspaceDto[]) => void = () => {
    throw new Error("Focus refetch did not start");
  };
  fixture.list.mockImplementation(
    () =>
      new Promise<WorkspaceDto[]>((resolve) => {
        finish = resolve;
      })
  );
  renderApp("/onboarding");
  fireEvent.change(screen.getByTestId("onboarding-name"), { target: { value: "Synthetic" } });
  fireEvent.click(screen.getByTestId("onboarding-next"));
  const legalName = screen.getByTestId("onboarding-legal-name");
  fireEvent.change(legalName, { target: { value: "Synthetic GmbH" } });

  const queryKey = ["workspaces", "tenant-a"];
  await act(async () => {
    client.setQueryData(queryKey, [], { updatedAt: Date.now() - 60_000 });
    focusManager.setFocused(false);
    focusManager.setFocused(true);
  });
  await waitFor(() => expect(fixture.list).toHaveBeenCalledOnce());
  expect(client.isFetching({ queryKey })).toBe(1);
  expect(screen.getByTestId("onboarding-legal-name")).toBe(legalName);

  await act(async () => {
    finish([]);
  });
  await waitFor(() => expect(client.isFetching({ queryKey })).toBe(0));
  expect(screen.getByTestId("onboarding-legal-name")).toHaveValue("Synthetic GmbH");
  fireEvent.click(screen.getByTestId("onboarding-back"));
  expect(screen.getByTestId("onboarding-name")).toHaveValue("Synthetic");
});

it("renders the dashboard after workspace creation waits for delayed discovery", async () => {
  setActiveWorkspaceId(null);
  let finish: (value: WorkspaceDto[]) => void = () => {
    throw new Error("Refresh did not start");
  };
  fixture.list.mockImplementation(
    () =>
      new Promise<WorkspaceDto[]>((resolve) => {
        finish = resolve;
      })
  );
  fixture.create.mockResolvedValue({ workspace });
  renderApp("/onboarding");
  fireEvent.change(screen.getByTestId("onboarding-name"), { target: { value: "Synthetic" } });
  fireEvent.click(screen.getByTestId("onboarding-next"));
  for (const [id, value] of [
    ["onboarding-legal-name", "Synthetic"],
    ["onboarding-address-line1", "Synthetic Street"],
    ["onboarding-city", "Berlin"],
    ["onboarding-postal", "10115"],
  ]) {
    fireEvent.change(screen.getByTestId(id), { target: { value } });
  }
  fireEvent.click(screen.getByTestId("onboarding-next"));
  fireEvent.click(screen.getByTestId("onboarding-submit"));
  await waitFor(() => expect(fixture.list).toHaveBeenCalled());
  await act(async () => {
    finish([workspace]);
  });
  await waitFor(() => {
    expect(window.location.pathname).toBe("/dashboard");
    expect(screen.getByRole("heading", { name: "Dashboard reached" })).toBeInTheDocument();
  });
  expect(screen.queryByRole("heading", { name: "Create your workspace" })).not.toBeInTheDocument();
  expect(fixture.create).toHaveBeenCalledOnce();
});

it("keeps non-workspace routes mounted when a saved workspace selection changes", async () => {
  setActiveWorkspaceId(null);
  fixture.list.mockResolvedValue([workspace]);
  renderApp("/public-booking");
  fireEvent.change(screen.getByLabelText("Public booking draft"), {
    target: { value: "Unsubmitted booking" },
  });
  await act(async () => {
    client.setQueryData(["workspaces", "tenant-a"], [workspace]);
    setActiveWorkspaceId(workspace.id);
  });
  expect(window.location.pathname).toBe("/public-booking");
  expect(screen.getByLabelText("Public booking draft")).toHaveValue("Unsubmitted booking");
});
