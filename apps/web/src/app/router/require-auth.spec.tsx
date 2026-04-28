import React from "react";
import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { RequireAuth } from "./require-auth";

let surfaceIdState = "platform";
let authState = { isAuthenticated: true, isLoading: false };
let workspaceState = { workspaces: [{ id: "ws_1" }], isLoading: false, isHostScope: false };

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
    workspaceState = { workspaces: [{ id: "ws_1" }], isLoading: false, isHostScope: false };
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
    workspaceState = { workspaces: [], isLoading: false, isHostScope: true };

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
});
