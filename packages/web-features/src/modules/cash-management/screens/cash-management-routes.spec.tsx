import React from "react";
import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
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
    getDashboard: vi.fn(),
    exportCashBook: vi.fn(),
    downloadExport: vi.fn(),
    listRegisters: vi.fn(),
    createRegister: vi.fn(),
    updateRegister: vi.fn(),
    listDayCloses: vi.fn(),
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
          {cashManagementRoutes().map((route) => (
            <Route key={route.path} {...route} />
          ))}
        </Routes>
      </QueryClientProvider>
    </MemoryRouter>
  );
};

describe("cash management route guards", () => {
  it("renders the dashboard without a permission gate", async () => {
    const { cashManagementApi } = await import("@corely/web-shared/lib/cash-management-api");
    vi.mocked(cashManagementApi.listRegisters).mockResolvedValue({
      registers: [
        {
          id: "reg-1",
          tenantId: "tenant-1",
          workspaceId: "ws-1",
          name: "Lotus Nails Berlin",
          location: "Berlin",
          currency: "EUR",
          currentBalanceCents: 0,
          disallowNegativeBalance: false,
          createdAt: "2026-03-01T00:00:00.000Z",
          updatedAt: "2026-03-01T00:00:00.000Z",
        },
      ],
    });
    vi.mocked(cashManagementApi.getDashboard).mockResolvedValue({
      dashboard: {
        registerId: "reg-1",
        salonName: "Lotus Nails Berlin",
        location: "Berlin",
        currency: "EUR",
        dayKey: "2026-03-14",
        monthKey: "2026-03",
        summary: {
          openingBalanceCents: 20000,
          cashIncomeTodayCents: 45000,
          cashExpensesTodayCents: 8000,
          privateDepositsCents: 0,
          privateWithdrawalsCents: 0,
          expectedClosingCents: 57000,
          countedCashCents: null,
          differenceCents: null,
        },
        status: {
          dayStatus: "needs-review",
          missingReceiptsToday: 2,
          missingReceiptsThisMonth: 4,
          receiptsAttachedToday: 1,
          reviewItemsCount: 1,
          suspiciousEntriesCount: 1,
          missingNotesCount: 0,
          openDaysThisWeek: 2,
          openDaysThisMonth: 3,
          receiptCompletionPercent: 33,
          exportStatus: "blocked-receipts",
          exportAlreadyGenerated: false,
        },
        closing: {
          isClosed: false,
          countedCashEntered: false,
          lastClosedDate: "2026-03-13",
          lastClosedBy: "user-1",
          responsiblePerson: null,
        },
        export: {
          lastExportDate: null,
          monthEntriesCompleted: 10,
          monthEntriesTotal: 14,
          checklist: {
            daysClosed: false,
            receiptsComplete: false,
            reviewQueueClear: false,
          },
        },
        trend: {
          weekIncomeCents: 60000,
          weekExpensesCents: 12000,
          openDaysCount: 3,
          missingReceiptsCount: 4,
          monthCashTotalCents: 180000,
          lastMonthCashTotalCents: 165000,
        },
        recentEntries: [],
      },
    });

    renderAt("/dashboard");

    expect(screen.queryByTestId("permission-gate")).not.toBeInTheDocument();
    expect(await screen.findByText("Today's cash book is still open")).toBeInTheDocument();
  });

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
