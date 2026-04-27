import React from "react";
import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { posAdminRoutes } from "../../../features/pos-admin";

const requirePermissionMock = vi.fn(
  ({ permission }: { permission: string; children: React.ReactNode }) => (
    <div data-testid="permission-gate" data-permission={permission} />
  )
);

vi.mock("@corely/web-shared/shared/permissions", () => ({
  RequirePermission: (props: { permission: string; children: React.ReactNode }) =>
    requirePermissionMock(props),
}));

vi.mock("@corely/web-shared/lib/pos-registers-api", () => ({
  posRegistersApi: {
    listRegisters: vi.fn(),
    createRegister: vi.fn(),
  },
}));

vi.mock("@corely/web-shared/lib/pos-transactions-api", () => ({
  posTransactionsApi: {
    listTransactions: vi.fn(),
    getTransaction: vi.fn(),
  },
}));

const renderAt = (path: string) => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
    },
  });

  return render(
    <MemoryRouter initialEntries={[path]}>
      <QueryClientProvider client={queryClient}>
        <Routes>
          {posAdminRoutes().map((route) => (
            <Route key={route.path} {...route} />
          ))}
        </Routes>
      </QueryClientProvider>
    </MemoryRouter>
  );
};

describe("pos transaction route guards", () => {
  it("guards the transactions list with the read permission", () => {
    renderAt("/pos/admin/transactions");

    expect(screen.getByTestId("permission-gate")).toHaveAttribute(
      "data-permission",
      "pos.transactions.read"
    );
  });

  it("guards the transaction detail page with the read permission", () => {
    renderAt("/pos/admin/transactions/aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa");

    expect(screen.getByTestId("permission-gate")).toHaveAttribute(
      "data-permission",
      "pos.transactions.read"
    );
  });
});
