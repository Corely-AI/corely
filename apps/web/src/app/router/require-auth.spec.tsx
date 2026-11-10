import React from "react";
import { cleanup, render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
afterEach(cleanup);
import { RequireAuth } from "./require-auth";

let surfaceIdState = "platform";
let authState = { isAuthenticated: true, isLoading: false };
const setWorkspace = vi.fn();
let workspaceState = {
  workspaces: [{ id: "ws_1" }],
  activeWorkspaceId: "ws_1",
  setWorkspace,
  isLoading: false,
  isHostScope: false,
};

vi.mock("@/lib/auth-provider", () => ({
  useAuth: () => authState,
}));

vi.mock("@/shared/workspaces/workspace-provider", () => ({
  useWorkspace: () => workspaceState,
}));

vi.mock("@corely/web-shared/shared/surface", () => ({
  useSurfaceId: () => surfaceIdState,
  getDefaultRouteForSurface: (surfaceId: string) =>
    surfaceId === "crm" ? "/crm" : surfaceId === "pos" ? "/restaurant/floor-plan" : "/dashboard",
  isRouteAllowedForSurface: (surfaceId: string, pathname: string) => {
    if (surfaceId === "platform") {
      return true;
    }
    if (surfaceId === "crm") {
      return pathname.startsWith("/crm") || pathname.startsWith("/assistant");
    }
    if (surfaceId === "pos") {
      return pathname.startsWith("/restaurant") || pathname.startsWith("/cash");
    }
    return false;
  },
}));

describe("RequireAuth surface gating", () => {
  beforeEach(() => {
    surfaceIdState = "platform";
    authState = { isAuthenticated: true, isLoading: false };
    workspaceState = {
      workspaces: [{ id: "ws_1" }],
      activeWorkspaceId: "ws_1",
      setWorkspace,
      isLoading: false,
      isHostScope: false,
    };
    setWorkspace.mockClear();
  });

  it("redirects dashboard traffic to the CRM landing route on CRM surface", () => {
    surfaceIdState = "crm";

    render(
      <MemoryRouter initialEntries={["/dashboard"]}>
        <Routes>
          <Route element={<RequireAuth />}>
            <Route path="/crm" element={<div>CRM Landing</div>} />
            <Route path="/dashboard" element={<div>Dashboard</div>} />
          </Route>
        </Routes>
      </MemoryRouter>
    );

    expect(screen.getByText("CRM Landing")).toBeInTheDocument();
  });

  it("redirects host dashboard traffic to tenant settings", () => {
    workspaceState = { ...workspaceState, workspaces: [], isHostScope: true };

    render(
      <MemoryRouter initialEntries={["/dashboard"]}>
        <Routes>
          <Route element={<RequireAuth />}>
            <Route path="/settings/tenants" element={<div>Tenant Settings</div>} />
            <Route path="/dashboard" element={<div>Dashboard</div>} />
          </Route>
        </Routes>
      </MemoryRouter>
    );

    expect(screen.getByText("Tenant Settings")).toBeInTheDocument();
  });

  it("shows not found when a route is disallowed for the active surface", () => {
    surfaceIdState = "crm";

    render(
      <MemoryRouter initialEntries={["/expenses"]}>
        <Routes>
          <Route element={<RequireAuth />}>
            <Route path="/expenses" element={<div>Expenses</div>} />
          </Route>
        </Routes>
      </MemoryRouter>
    );

    expect(screen.getByText("404")).toBeInTheDocument();
  });

  it("adopts an authorized workspace before mounting module content", () => {
    workspaceState = { ...workspaceState, workspaces: [{ id: "ws_1" }, { id: "ws_2" }] };
    render(
      <MemoryRouter initialEntries={["/expenses?workspaceId=ws_2"]}>
        <Routes>
          <Route element={<RequireAuth />}>
            <Route path="/expenses" element={<div>Private expenses</div>} />
          </Route>
        </Routes>
      </MemoryRouter>
    );
    expect(setWorkspace).toHaveBeenCalledWith("ws_2");
    expect(screen.queryByText("Private expenses")).toBeNull();
  });

  it.each(["workspaceId=unknown", "workspaceId=ws_1&workspaceId=ws_2", "workspaceId=bad%2Fid"])(
    "rejects unauthorized or invalid workspace intent: %s",
    (query) => {
      render(
        <MemoryRouter initialEntries={[`/expenses?${query}`]}>
          <Routes>
            <Route element={<RequireAuth />}>
              <Route path="/expenses" element={<div>Private expenses</div>} />
            </Route>
          </Routes>
        </MemoryRouter>
      );
      expect(screen.getByText("404")).toBeInTheDocument();
      expect(setWorkspace).not.toHaveBeenCalled();
      expect(screen.queryByText("Private expenses")).toBeNull();
    }
  );
});
