import React, { useState } from "react";
import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider, useQuery } from "@tanstack/react-query";
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
  await waitFor(() => {
    expect(screen.getByText("Workspace B")).toBeInTheDocument();
    expect(screen.queryByText("Workspace A")).not.toBeInTheDocument();
    expect(screen.getByText("workspace-b")).toBeInTheDocument();
  });
  client.clear();
});

it("discards cached payloads and local view state before fetching in a new workspace", async () => {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  client.setQueryData(["workspaces", "tenant-a"], [workspace("a"), workspace("b")]);
  client.setQueryData(["legacy-private-key"], "Private workspace A");
  list.mockResolvedValue([workspace("a"), workspace("b")]);
  setActiveWorkspaceId("workspace-a");
  let finishNew: (value: string) => void = () => {
    throw new Error("New query not started");
  };
  const fetchNew = new Promise<string>((resolve) => {
    finishNew = resolve;
  });
  let finishOld: (value: string) => void = () => {
    throw new Error("Old query not started");
  };
  function PrivateView() {
    const { setWorkspace } = useWorkspace();
    const [draft, setDraft] = useState("");
    const { data } = useQuery({
      queryKey: ["legacy-private-key"],
      queryFn: () => fetchNew,
      staleTime: Infinity,
    });
    return (
      <>
        <input
          aria-label="Private draft"
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
        />
        <p>{data ?? "Loading new workspace"}</p>
        <button onClick={() => setWorkspace("workspace-b")}>Switch workspace</button>
      </>
    );
  }
  render(
    <QueryClientProvider client={client}>
      <WorkspaceProvider>
        <PrivateView />
      </WorkspaceProvider>
    </QueryClientProvider>
  );
  fireEvent.change(screen.getByLabelText("Private draft"), {
    target: { value: "Private unsaved A" },
  });
  const oldFetch = client
    .fetchQuery({
      queryKey: ["legacy-private-key"],
      queryFn: () =>
        new Promise<string>((resolve) => {
          finishOld = resolve;
        }),
      staleTime: 0,
    })
    .catch(() => undefined);
  fireEvent.click(screen.getByRole("button", { name: "Switch workspace" }));
  expect(screen.queryByText("Private workspace A")).not.toBeInTheDocument();
  expect(screen.getByLabelText("Private draft")).toHaveValue("");
  expect(client.getQueryData(["legacy-private-key"])).toBeUndefined();
  await act(async () => {
    finishNew("Private workspace B");
  });
  expect(await screen.findByText("Private workspace B")).toBeInTheDocument();
  await act(async () => {
    finishOld("Late private workspace A");
    await oldFetch;
  });
  expect(screen.queryByText("Late private workspace A")).not.toBeInTheDocument();
  expect(client.getQueryData(["legacy-private-key"])).toBe("Private workspace B");
  client.clear();
});
