import React from "react";
import { afterEach, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import RolePermissionsPage from "./RolePermissionsPage";

const fixture = vi.hoisted(() => ({
  currentRoleId: "owner-role",
  update: vi.fn().mockResolvedValue(undefined),
  data: {
    role: { id: "staff-role", name: "Staff", systemKey: "STAFF", isSystem: true },
    catalog: [
      {
        id: "documents",
        label: "Documents",
        permissions: [{ key: "documents.read", group: "documents", label: "Read documents" }],
      },
    ],
    grants: [],
  },
}));
vi.mock("@corely/web-shared/lib/auth-provider", () => ({
  useAuth: () => ({
    user: {
      activeTenantId: "tenant-a",
      activeWorkspaceId: "workspace-a",
      memberships: [
        { tenantId: "tenant-other", roleId: "staff-role" },
        { tenantId: "tenant-a", roleId: fixture.currentRoleId },
      ],
    },
  }),
}));
vi.mock("../hooks/useRoles", () => ({
  useRoles: () => ({
    data: [
      { id: "owner-role", name: "Owner", systemKey: "OWNER" },
      { id: "staff-role", name: "Staff", systemKey: "STAFF", isSystem: true },
    ],
  }),
}));
vi.mock("../hooks/useRolePermissions", () => ({
  useRolePermissions: () => ({ data: fixture.data, isLoading: false }),
}));
vi.mock("../hooks/useUpdateRolePermissions", () => ({
  useUpdateRolePermissions: () => ({ mutateAsync: fixture.update, isPending: false }),
  useSyncOwnerPermissions: () => ({ mutateAsync: vi.fn(), isPending: false }),
}));

function renderPermissions() {
  return render(
    <MemoryRouter initialEntries={["/settings/roles/staff-role"]}>
      <Routes>
        <Route path="/settings/roles/:roleId" element={<RolePermissionsPage />} />
      </Routes>
    </MemoryRouter>
  );
}
afterEach(() => {
  cleanup();
  fixture.currentRoleId = "owner-role";
  fixture.update.mockClear();
});

it("lets the tenant Owner edit and save system-role grants with a distinct workspace ID", async () => {
  renderPermissions();
  const checkbox = screen.getByRole("checkbox");
  expect(checkbox).toBeEnabled();
  fireEvent.click(checkbox);
  fireEvent.click(screen.getByRole("button", { name: "Save changes" }));
  await waitFor(() =>
    expect(fixture.update).toHaveBeenCalledWith({
      grants: [{ key: "documents.read", effect: "ALLOW" }],
    })
  );
});

it("keeps system-role grant editing disabled for a non-Owner", () => {
  fixture.currentRoleId = "staff-role";
  renderPermissions();
  expect(screen.getByRole("checkbox")).toBeDisabled();
  expect(screen.getByRole("button", { name: "Save changes" })).toBeDisabled();
});
