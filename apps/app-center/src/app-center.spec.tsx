import React from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AppCenter } from "./app-center";

const mocks = vi.hoisted(() => ({
  json: vi.fn(),
  leave: vi.fn(),
  logout: vi.fn(),
  select: vi.fn(),
}));
vi.mock("@corely/web-shared/session/session-context", () => ({
  useSession: () => ({
    client: { json: mocks.json },
    state: { status: "authenticated", session: { user: { name: "Alex Example" } } },
    logout: mocks.logout,
  }),
}));
vi.mock("@corely/web-shared/session/workspace-session-context", () => ({
  useWorkspaceSession: () => ({
    scope: {
      userId: "user-a",
      tenantId: "tenant-a",
      workspaceId: "workspace-a",
      appKey: "app-center",
    },
    workspace: { id: "workspace-a", name: "Linden studio" },
    workspaces: [{ id: "workspace-a", name: "Linden studio", tenantId: "tenant-a" }],
    selectWorkspace: mocks.select,
    confirmExternalNavigation: mocks.leave,
  }),
}));
const invoice = {
  appId: "invoices",
  enabled: true,
  launch: {
    launchId: "invoice",
    category: "finance",
    availability: "available",
    url: "https://invoice.app.corely.one/",
    displayName: { en: "Invoice" },
  },
};
afterEach(() => {
  cleanup();
  vi.resetAllMocks();
});
function setup() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <AppCenter locale="en" />
    </QueryClientProvider>
  );
}
describe("app launch revalidation", () => {
  it("refreshes the projection before opening an app", async () => {
    mocks.json.mockResolvedValue([invoice]);
    setup();
    fireEvent.click(await screen.findByRole("button", { name: "Open: Invoice" }));
    await waitFor(() => expect(mocks.leave).toHaveBeenCalledOnce());
    expect(mocks.json).toHaveBeenCalledTimes(2);
    expect(mocks.json.mock.calls.every(([path]) => path === "/menu/launches")).toBe(true);
  });
  it("stays in App Center if access is removed before launch", async () => {
    mocks.json.mockResolvedValueOnce([invoice]).mockResolvedValueOnce([]);
    setup();
    fireEvent.click(await screen.findByRole("button", { name: "Open: Invoice" }));
    await screen.findByRole("alert");
    expect(mocks.leave).not.toHaveBeenCalled();
  });
  it("cannot navigate after the workspace boundary unmounts", async () => {
    let finish: (value: unknown[]) => void = () => {
      throw new Error("Launch not started");
    };
    mocks.json.mockResolvedValueOnce([invoice]).mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          finish = resolve;
        })
    );
    const view = setup();
    fireEvent.click(await screen.findByRole("button", { name: "Open: Invoice" }));
    await waitFor(() => expect(mocks.json).toHaveBeenCalledTimes(2));
    view.unmount();
    finish([invoice]);
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(mocks.leave).not.toHaveBeenCalled();
  });
});
