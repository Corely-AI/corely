import React from "react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ApiClient, AuthClient } from "@corely/auth-client";
import { WebStorageAdapter } from "@corely/web-shared/lib/storage-adapter";
import { workspacesApi } from "@corely/web-shared/shared/workspaces/workspaces-api";
import {
  WorkspaceProvider,
  useWorkspace,
} from "@corely/web-shared/shared/workspaces/workspace-provider";
import {
  getActiveWorkspaceId,
  setActiveWorkspaceId,
} from "@corely/web-shared/shared/workspaces/workspace-store";
import type { WorkspaceDto } from "@corely/contracts";

const fixture = vi.hoisted(() => ({ api: null as ApiClient | null }));
vi.mock("@corely/web-shared/lib/api-client", () => ({
  apiClient: {
    get: <T,>(...args: Parameters<ApiClient["get"]>) => fixture.api!.get<T>(...args),
    post: <T,>(...args: Parameters<ApiClient["post"]>) => fixture.api!.post<T>(...args),
    generateIdempotencyKey: () => fixture.api!.generateIdempotencyKey(),
    generateCorrelationId: () => fixture.api!.generateCorrelationId(),
  },
}));
vi.mock("@corely/web-shared/lib/auth-provider", () => ({
  useAuth: () => ({
    isAuthenticated: true,
    isLoading: false,
    user: { activeTenantId: "tenant-a" },
  }),
}));

const replacement: WorkspaceDto = {
  id: "workspace-new",
  name: "Replacement",
  legalEntityId: "legal-new",
  kind: "PERSONAL",
  onboardingStatus: "NEW",
  createdAt: "2026-11-07T00:00:00Z",
  updatedAt: "2026-11-07T00:00:00Z",
};
let available: WorkspaceDto[];
let queryClient: QueryClient;
const calls: Array<{ method: string; workspaceId: string | null; idempotency: string | null }> = [];

beforeEach(async () => {
  available = [];
  calls.length = 0;
  setActiveWorkspaceId("workspace-deleted");
  const storage = new WebStorageAdapter();
  const payload = btoa(JSON.stringify({ exp: 9999999999 }));
  await storage.setAccessToken(`synthetic.${payload}.signature`);
  const authClient = new AuthClient({ apiUrl: "https://synthetic.invalid", storage });
  await authClient.loadStoredTokens();
  fixture.api = new ApiClient({ apiUrl: "https://synthetic.invalid", authClient, storage });
  queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  vi.stubGlobal(
    "fetch",
    vi.fn(async (_url: string, init: RequestInit) => {
      const headers = new Headers(init.headers);
      const workspaceId = headers.get("x-workspace-id");
      calls.push({
        method: init.method ?? "GET",
        workspaceId,
        idempotency: headers.get("x-idempotency-key"),
      });
      if (workspaceId === "workspace-deleted") {
        return Response.json({ message: "Workspace access denied" }, { status: 403 });
      }
      if (init.method === "POST") {
        available = [replacement];
        return Response.json({ workspace: replacement }, { status: 201 });
      }
      return Response.json({ workspaces: available });
    })
  );
});
afterEach(() => {
  cleanup();
  queryClient.clear();
  setActiveWorkspaceId(null);
  localStorage.clear();
  vi.unstubAllGlobals();
});

function Probe() {
  const { activeWorkspaceId, isLoading } = useWorkspace();
  return <output>{isLoading ? "loading" : (activeWorkspaceId ?? "no workspace")}</output>;
}
function renderWorkspace() {
  render(
    <QueryClientProvider client={queryClient}>
      <WorkspaceProvider>
        <Probe />
      </WorkspaceProvider>
    </QueryClientProvider>
  );
}

it("creates a replacement without depending on the deleted active workspace", async () => {
  expect(await workspacesApi.createWorkspace({ name: "Replacement", kind: "PERSONAL" })).toEqual({
    workspace: replacement,
  });
  expect(calls[0]).toMatchObject({ method: "POST", workspaceId: null });
  expect(calls[0]?.idempotency).toBeTruthy();
  // Recovery does not clear shared storage while another request might still use it.
  expect(getActiveWorkspaceId()).toBe("workspace-deleted");
});

it("clears the dead selection after a successful empty discovery", async () => {
  renderWorkspace();
  expect(await screen.findByText("no workspace")).toBeInTheDocument();
  expect(getActiveWorkspaceId()).toBeNull();
  expect(calls[0]).toMatchObject({ method: "GET", workspaceId: null });
});

it("recovers to an authorized remaining workspace without reloading auth", async () => {
  available = [replacement];
  renderWorkspace();
  expect(await screen.findByText("workspace-new")).toBeInTheDocument();
  expect(getActiveWorkspaceId()).toBe("workspace-new");
});

it("preserves the selection on a discovery error rather than treating it as an empty list", async () => {
  vi.mocked(fetch).mockResolvedValue(Response.json({ message: "Unavailable" }, { status: 503 }));
  renderWorkspace();
  expect(await screen.findByText("workspace-deleted")).toBeInTheDocument();
  expect(getActiveWorkspaceId()).toBe("workspace-deleted");
});
