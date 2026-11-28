import React from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { TenantEntitlementsPage } from "./TenantEntitlementsPage";
const api = vi.hoisted(() => ({
  entitlements: vi.fn(),
  catalog: vi.fn(),
  tenant: "team-a",
  refreshes: new Map<string, () => Promise<void>>(),
}));
vi.mock("react-router-dom", () => ({ useParams: () => ({ tenantId: api.tenant }) }));
vi.mock("@/lib/platform-entitlements-api", () => ({
  platformEntitlementsApi: { getEntitlements: api.entitlements },
}));
vi.mock("@/lib/api-client", () => ({ apiClient: { get: api.catalog } }));
vi.mock("./TenantFeaturesTab", () => ({ TenantFeaturesTab: () => null }));
vi.mock("./TenantUsersTab", () => ({ TenantUsersTab: () => null }));
vi.mock("./TenantAppsTab", () => ({
  TenantAppsTab: ({
    tenantId,
    entitlements,
    onRefresh,
  }: {
    tenantId: string;
    entitlements: { appId: string }[];
    onRefresh: () => Promise<void>;
  }) => {
    api.refreshes.set(tenantId, onRefresh);
    const [feedback, setFeedback] = React.useState("");
    return (
      <div>
        <p>
          Configuration: {tenantId}/{entitlements[0]?.appId}
        </p>
        <p>{feedback}</p>
        <button
          onClick={() => {
            setFeedback("Saved feedback");
            void onRefresh();
          }}
        >
          Refresh saved change
        </button>
      </div>
    );
  },
}));
afterEach(() => {
  cleanup();
  vi.resetAllMocks();
  api.refreshes.clear();
});
const data = (id: string) => ({
  apps: [{ appId: id }],
  features: [],
  generatedAt: "2026-11-09T00:00:00Z",
});
function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((done) => {
    resolve = done;
  });
  return { promise, resolve };
}
function setup() {
  api.catalog.mockResolvedValue([]);
  api.tenant = "team-a";
  return render(<TenantEntitlementsPage />);
}

describe("host configuration refresh", () => {
  it("keeps success feedback mounted while fetching updated configuration", async () => {
    const next = deferred<ReturnType<typeof data>>();
    api.entitlements.mockResolvedValueOnce(data("invoices")).mockReturnValueOnce(next.promise);
    setup();
    fireEvent.click(await screen.findByRole("button", { name: "Refresh saved change" }));
    expect(screen.getByText("Saved feedback")).toBeTruthy();
    await act(async () => {
      next.resolve(data("updated"));
    });
    await screen.findByText("Configuration: team-a/updated");
    expect(screen.getByText("Saved feedback")).toBeTruthy();
  });
  it("ignores a late previous-tenant response after navigation", async () => {
    const old = deferred<ReturnType<typeof data>>();
    api.entitlements.mockImplementation((tenant: string) =>
      tenant === "team-a" ? old.promise : Promise.resolve(data("team-b-app"))
    );
    const view = setup();
    api.tenant = "team-b";
    view.rerender(<TenantEntitlementsPage />);
    await screen.findByText("Configuration: team-b/team-b-app");
    await act(async () => {
      old.resolve(data("team-a-app"));
    });
    expect(screen.getByText("Configuration: team-b/team-b-app")).toBeTruthy();
    expect(screen.queryByText(/team-a-app/)).toBeNull();
  });
  it("does not let a completed old-tenant save supersede the active tenant refresh", async () => {
    api.entitlements.mockImplementation((tenant: string) => Promise.resolve(data(`${tenant}-app`)));
    const view = setup();
    await screen.findByText("Configuration: team-a/team-a-app");
    const oldRefresh = api.refreshes.get("team-a");
    if (!oldRefresh) {
      throw new Error("Missing initial refresh callback");
    }
    api.tenant = "team-b";
    view.rerender(<TenantEntitlementsPage />);
    await screen.findByText("Configuration: team-b/team-b-app");
    await act(async () => {
      await oldRefresh();
    });
    expect(screen.getByText("Configuration: team-b/team-b-app")).toBeTruthy();
    expect(api.entitlements).toHaveBeenCalledTimes(2);
    expect(api.catalog.mock.calls.map(([url]) => url)).toEqual([
      "/platform/apps?forTenantId=team-a",
      "/platform/apps?forTenantId=team-b",
    ]);
  });
});
