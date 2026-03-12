import React from "react";
import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { cashManagementRoutes } from "../../../features/cash-management";

const requirePermissionMock = vi.fn(
  ({ permission }: { permission: string; children: React.ReactNode }) => (
    <div data-testid="permission-gate" data-permission={permission} />
  )
);

vi.mock("@corely/web-shared/shared/permissions", () => ({
  RequirePermission: (props: { permission: string; children: React.ReactNode }) =>
    requirePermissionMock(props),
}));

vi.mock("@corely/web-shared/lib/cash-management-api", () => ({
  cashManagementApi: {
    getRegister: vi.fn(),
    listEntries: vi.fn(),
    listAttachments: vi.fn(),
    createEntry: vi.fn(),
    reverseEntry: vi.fn(),
    attachBeleg: vi.fn(),
    getDayClose: vi.fn(),
    submitDayClose: vi.fn(),
    exportCashBook: vi.fn(),
    downloadExport: vi.fn(),
    listRegisters: vi.fn(),
    createRegister: vi.fn(),
    updateRegister: vi.fn(),
    listDayCloses: vi.fn(),
  },
}));

const renderAt = (path: string) =>
  render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        {cashManagementRoutes().map((route) => (
          <Route key={route.path} {...route} />
        ))}
      </Routes>
    </MemoryRouter>
  );

describe("cash management route guards", () => {
  it("guards register creation and entries with cash.write", async () => {
    const firstRender = renderAt("/cash/registers/new");

    expect(await firstRender.findByTestId("permission-gate")).toHaveAttribute(
      "data-permission",
      "cash.write"
    );

    firstRender.unmount();
    requirePermissionMock.mockClear();
    const secondRender = renderAt("/cash/registers/reg-1/entries");

    expect(await secondRender.findByTestId("permission-gate")).toHaveAttribute(
      "data-permission",
      "cash.write"
    );
  });

  it("guards day close with cash.close", async () => {
    renderAt("/cash/registers/reg-1/day-close");

    expect(await screen.findByTestId("permission-gate")).toHaveAttribute(
      "data-permission",
      "cash.close"
    );
  });

  it("guards exports with cash.export", async () => {
    renderAt("/cash/registers/reg-1/exports");

    expect(await screen.findByTestId("permission-gate")).toHaveAttribute(
      "data-permission",
      "cash.export"
    );
  });
});
