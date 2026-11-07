import React from "react";
import { act, cleanup, render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { afterEach, expect, it, vi } from "vitest";
import type { WorkspaceDto } from "@corely/contracts";
import {
  WorkspaceProvider,
  useWorkspace,
} from "@corely/web-shared/shared/workspaces/workspace-provider";
import { setActiveWorkspaceId } from "@corely/web-shared/shared/workspaces/workspace-store";

const auth = vi.hoisted(() => ({ tenantId: "tenant-a", isLoading: false }));
const list = vi.hoisted(() => vi.fn());
vi.mock("@corely/web-shared/lib/auth-provider", () => ({
  useAuth: () => ({
    isAuthenticated: true,
    isLoading: auth.isLoading,
    user: { activeTenantId: auth.tenantId },
  }),
}));
vi.mock("@corely/web-shared/shared/workspaces/workspaces-api", () => ({
  workspacesApi: { listWorkspaces: list },
}));

function Probe() {
  const { workspaces, activeWorkspaceId } = useWorkspace();
  return (
    <div>
      {workspaces.map((workspace) => (
        <span key={workspace.id}>{workspace.name}</span>
      ))}
      <output>{activeWorkspaceId}</output>
    </div>
  );
}
const workspace = (suffix: string): WorkspaceDto => ({
  id: `workspace-${suffix}`,
  name: `Workspace ${suffix.toUpperCase()}`,
  legalEntityId: `legal-${suffix}`,
  kind: "PERSONAL",
  onboardingStatus: "NEW",
  createdAt: "2026-11-07T00:00:00Z",
  updatedAt: "2026-11-07T00:00:00Z",
});
afterEach(() => {
  cleanup();
  setActiveWorkspaceId(null);
  list.mockReset();
  auth.tenantId = "tenant-a";
  auth.isLoading = false;
});

it("does not reuse another tenant's workspace list while discovery is pending", async () => {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  client.setQueryData(["workspaces", "tenant-a"], [workspace("a")]);
  setActiveWorkspaceId("workspace-a");
  let resolveList: (value: WorkspaceDto[]) => void = () => {
    throw new Error("Query has not started");
  };
  list.mockReturnValue(
    new Promise<WorkspaceDto[]>((resolve) => {
      resolveList = resolve;
    })
  );
  const tree = () => (
    <QueryClientProvider client={client}>
      <WorkspaceProvider>
        <Probe />
      </WorkspaceProvider>
    </QueryClientProvider>
  );
  const view = render(tree());
  expect(screen.getByText("Workspace A")).toBeInTheDocument();
  auth.isLoading = true;
  auth.tenantId = "tenant-b";
  view.rerender(tree());
  expect(list).not.toHaveBeenCalled();
  auth.tenantId = "tenant-b";
  auth.isLoading = false;
  view.rerender(tree());
  expect(screen.queryByText("Workspace A")).not.toBeInTheDocument();
  await act(async () => {
    resolveList([workspace("b")]);
  });
  expect(await screen.findByText("Workspace B")).toBeInTheDocument();
  expect(screen.queryByText("Workspace A")).not.toBeInTheDocument();
  expect(await screen.findByText("workspace-b")).toBeInTheDocument();
  client.clear();
});
