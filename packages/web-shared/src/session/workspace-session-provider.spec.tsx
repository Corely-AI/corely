import React, { useState } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import "@testing-library/jest-dom/vitest";
import { createMemoryRouter, RouterProvider } from "react-router-dom";
import { onlineManager, useMutation, useQuery } from "@tanstack/react-query";
import { z } from "zod";
import { WorkspaceSessionProviders } from "./workspace-session-provider";
import { useWorkspaceSession, useWorkspaceDraftGuard } from "./workspace-session-context";
import { useSession } from "./session-context";
import { shellConfig } from "../../testkit/workspace-config-fixture";

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  localStorage.clear();
  onlineManager.setOnline(true);
});
function Protected() {
  const { scope, selectWorkspace } = useWorkspaceSession();
  const { client } = useSession();
  const [draft, setDraft] = useState("");
  useWorkspaceDraftGuard(Boolean(draft));
  // Deliberately static key: even a caller mistake must not hydrate another scope's cache.
  const query = useQuery({
    queryKey: ["records"],
    queryFn: () => client.json("/invoices", z.object({ label: z.string() })),
  });
  const save = useMutation({
    mutationFn: () =>
      client.json("/invoices", z.object({ label: z.string() }), { method: "POST", body: "{}" }),
  });
  return (
    <>
      <p>{query.data?.label}</p>
      <p>{scope.workspaceId}</p>
      <input aria-label="Draft" value={draft} onChange={(event) => setDraft(event.target.value)} />
      <button onClick={() => save.mutate()}>Save draft</button>
      <button onClick={() => selectWorkspace("workspace-b")}>Switch to B</button>
      <button onClick={() => selectWorkspace("workspace-a")}>Switch to A</button>
    </>
  );
}
function setup(
  path = "/?workspaceId=workspace-a",
  unavailable = false,
  write: "normal" | "hold" | "fail" = "normal"
) {
  let user = "user-a";
  let finishWrite: ((response: Response) => void) | undefined;
  const fetcher = vi.fn<typeof fetch>().mockImplementation(async (input, init) => {
    const path = String(input);
    const headers = new Headers(init?.headers);
    const tenant = headers.get("x-tenant-id");
    const workspace = headers.get("x-workspace-id");
    const allowed = user === "user-a" ? ["tenant-a", "tenant-b"] : ["tenant-b"];
    if (
      tenant &&
      (!allowed.includes(tenant) ||
        (workspace && workspace !== tenant.replace("tenant", "workspace")))
    ) {
      return Response.json({}, { status: 403 });
    }
    if (path === "/api/session/user") {
      return Response.json({
        csrfToken: "a".repeat(43),
        expiresAt: "2099-01-01T00:00:00Z",
        appKey: "invoice",
        user: {
          userId: user,
          name: user,
          email: `${user}@example.invalid`,
          memberships: allowed.map((id) => ({ tenantId: id, tenantName: id, roleId: "member" })),
        },
      });
    }
    if (path === "/api/bff/workspaces") {
      const id = tenant?.replace("tenant", "workspace");
      return Response.json({
        workspaces: [
          {
            id,
            name: id,
            legalEntityId: `legal-${id}`,
            kind: "COMPANY",
            onboardingStatus: "DONE",
            createdAt: "2026-01-01T00:00:00Z",
            updatedAt: "2026-01-01T00:00:00Z",
          },
        ],
      });
    }
    if (path.includes("/config?")) {
      const config = shellConfig("invoice");
      config.workspaceId = workspace ?? "";
      if (unavailable) {
        config.navigation.groups = [];
      }
      return Response.json(config);
    }
    if (path === "/api/bff/invoices") {
      if (init?.method === "POST" && write === "fail") {
        throw new TypeError("Synthetic offline connection");
      }
      if (init?.method === "POST" && write === "hold") {
        return new Promise<Response>((resolve) => {
          finishWrite = resolve;
        });
      }
      return Response.json({ label: `Records: ${user}/${tenant}/${workspace}` });
    }
    return Response.json({}, { status: 404 });
  });
  const router = createMemoryRouter(
    [
      {
        path: "*",
        element: (
          <WorkspaceSessionProviders appKey="invoice" fetchFn={fetcher}>
            <Protected />
          </WorkspaceSessionProviders>
        ),
      },
    ],
    { initialEntries: [path] }
  );
  render(<RouterProvider router={router} />);
  return {
    router,
    fetcher,
    userEvent: userEvent.setup(),
    finishWrite: () => finishWrite?.(Response.json({ label: "saved" })),
    changeAccount: () => {
      user = "user-b";
      fireEvent.focus(window);
    },
  };
}
describe("workspace session boundary", () => {
  it.each([
    "workspaceId=foreign",
    "workspaceId=",
    "workspaceId=workspace-a&workspaceId=workspace-b",
  ])("never loads feature data for altered hint %s", async (query) => {
    const f = setup(`/?${query}`);
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "requested workspace is unavailable"
    );
    expect(
      f.fetcher.mock.calls.some(
        ([path]) => String(path).includes("/config?") || path === "/api/bff/invoices"
      )
    ).toBe(false);
  });
  it("waits for an explicit choice when no workspace hint exists", async () => {
    const f = setup("/");
    expect(await screen.findByText("Choose a workspace")).toBeVisible();
    expect(f.fetcher.mock.calls.some(([path]) => path === "/api/bff/invoices")).toBe(false);
    await f.userEvent.click(screen.getByRole("button", { name: "tenant-b · workspace-b" }));
    expect(await screen.findByText("Records: user-a/tenant-b/workspace-b")).toBeVisible();
  });
  it("validates app access before mounting feature queries", async () => {
    const f = setup(undefined, true);
    expect(await screen.findByRole("alert")).toHaveTextContent("app is unavailable");
    expect(f.fetcher.mock.calls.some(([path]) => path === "/api/bff/invoices")).toBe(false);
  });
  it("guards dirty workspace and history switches and never reuses another tenant's cached records", async () => {
    const f = setup();
    await screen.findByText("Records: user-a/tenant-a/workspace-a");
    await f.userEvent.type(screen.getByLabelText("Draft"), "Original account draft");
    await f.userEvent.click(screen.getByRole("button", { name: "Switch to B" }));
    expect(await screen.findByRole("alertdialog")).toHaveTextContent("unsaved changes");
    await f.userEvent.click(screen.getByRole("button", { name: "Stay" }));
    expect(screen.getByLabelText("Draft")).toHaveValue("Original account draft");
    await f.userEvent.click(screen.getByRole("button", { name: "Switch to B" }));
    await f.userEvent.click(screen.getByRole("button", { name: "Leave page" }));
    expect(await screen.findByText("Records: user-a/tenant-b/workspace-b")).toBeVisible();
    expect(screen.queryByText("Records: user-a/tenant-a/workspace-a")).toBeNull();
    expect(screen.getByLabelText("Draft")).toHaveValue("");
    await f.userEvent.type(screen.getByLabelText("Draft"), "B draft");
    await act(async () => {
      void f.router.navigate(-1);
    });
    expect(await screen.findByRole("alertdialog")).toBeVisible();
    await f.userEvent.click(screen.getByRole("button", { name: "Stay" }));
    expect(screen.getByLabelText("Draft")).toHaveValue("B draft");
  });
  it("does not switch scopes until an in-flight write has a known result", async () => {
    const f = setup(undefined, false, "hold");
    await screen.findByText("Records: user-a/tenant-a/workspace-a");
    await f.userEvent.click(screen.getByRole("button", { name: "Save draft" }));
    await f.userEvent.click(screen.getByRole("button", { name: "Switch to B" }));
    expect(await screen.findByRole("alertdialog")).toHaveTextContent("request is still running");
    expect(screen.getByRole("button", { name: "Leave page" })).toBeDisabled();
    expect(f.router.state.location.search).toBe("?workspaceId=workspace-a");
    await act(async () => f.finishWrite());
    await waitFor(() => expect(screen.getByRole("button", { name: "Leave page" })).toBeEnabled());
    await f.userEvent.click(screen.getByRole("button", { name: "Leave page" }));
    expect(await screen.findByText("Records: user-a/tenant-b/workspace-b")).toBeVisible();
    const writes = f.fetcher.mock.calls.filter(([, init]) => init?.method === "POST");
    expect(writes).toHaveLength(1);
    expect(new Headers(writes[0][1]?.headers).get("x-workspace-id")).toBe("workspace-a");
  });
  it("fails an offline write once instead of queuing it for another context", async () => {
    const f = setup(undefined, false, "fail");
    await screen.findByText("Records: user-a/tenant-a/workspace-a");
    onlineManager.setOnline(false);
    await f.userEvent.click(screen.getByRole("button", { name: "Save draft" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("temporarily unavailable");
    onlineManager.setOnline(true);
    expect(f.fetcher.mock.calls.filter(([, init]) => init?.method === "POST")).toHaveLength(1);
  });
  it("ignores legacy persisted workspace/cache state and does not expose the old account after a cookie change", async () => {
    localStorage.setItem("activeWorkspaceId", "workspace-a");
    localStorage.setItem("corely:query-cache", "Private legacy data");
    const f = setup("/?workspaceId=workspace-b");
    await screen.findByText("Records: user-a/tenant-b/workspace-b");
    f.changeAccount();
    expect(await screen.findByText("Records: user-b/tenant-b/workspace-b")).toBeVisible();
    expect(screen.queryByText("Records: user-a/tenant-b/workspace-b")).toBeNull();
    expect(screen.queryByText("Private legacy data")).toBeNull();
  });
});
