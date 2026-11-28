import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { WorkspaceDto } from "@corely/contracts";
import {
  WorkspaceProvider,
  useWorkspace,
} from "@corely/web-shared/shared/workspaces/workspace-provider";
import {
  getActiveWorkspaceId,
  setActiveWorkspaceId,
} from "@corely/web-shared/shared/workspaces/workspace-store";

vi.mock("@corely/web-shared/lib/auth-provider", () => ({
  useAuth: () => ({
    isAuthenticated: true,
    user: { activeTenantId: "tenant-a" },
    isLoading: false,
  }),
}));
vi.mock("@corely/web-shared/shared/workspaces/workspaces-api", () => ({
  workspacesApi: { listWorkspaces: async () => [] },
}));

const workspace: WorkspaceDto = {
  id: "first-studio",
  name: "Private studio",
  legalEntityId: "legal-a",
  kind: "COMPANY",
  publicEnabled: false,
  createdAt: "2026-11-28T00:00:00.000Z",
  updatedAt: "2026-11-28T00:00:00.000Z",
};

function WorkspaceSelection() {
  const current = useWorkspace();
  return (
    <>
      <p role="status">{current.activeWorkspace?.name ?? "No workspace"}</p>
      <button type="button" onClick={() => current.setWorkspace(workspace.id, workspace)}>
        Adopt created workspace
      </button>
    </>
  );
}

afterEach(() => {
  cleanup();
  setActiveWorkspaceId(null);
});
describe("Workspace selection after private studio setup", () => {
  it("replaces empty discovery with the authorized workspace returned by creation", async () => {
    setActiveWorkspaceId(null);
    const query = new QueryClient();
    query.setQueryData(["workspaces", "tenant-a"], []);
    query.setQueryData(["workspaces", "tenant-b"], [{ id: "other-workspace" }]);
    render(
      <QueryClientProvider client={query}>
        <WorkspaceProvider>
          <WorkspaceSelection />
        </WorkspaceProvider>
      </QueryClientProvider>
    );
    expect(screen.getByRole("status")).toHaveTextContent("No workspace");

    fireEvent.click(screen.getByRole("button", { name: "Adopt created workspace" }));

    await waitFor(() => expect(screen.getByRole("status")).toHaveTextContent("Private studio"));
    expect(getActiveWorkspaceId()).toBe(workspace.id);
    expect(query.getQueryData(["workspaces", "tenant-a"])).toEqual([workspace]);
  });
});
