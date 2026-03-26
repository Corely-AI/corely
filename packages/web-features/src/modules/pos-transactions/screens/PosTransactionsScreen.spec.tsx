import React from "react";
import { render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { PosTransactionsScreen } from "./PosTransactionsScreen";

const listTransactionsMock = vi.fn();
const listRegistersMock = vi.fn();

vi.mock("@corely/web-shared/lib/pos-transactions-api", () => ({
  posTransactionsApi: {
    listTransactions: (...args: unknown[]) => listTransactionsMock(...args),
    getTransaction: vi.fn(),
  },
}));

vi.mock("@corely/web-shared/lib/pos-registers-api", () => ({
  posRegistersApi: {
    listRegisters: (...args: unknown[]) => listRegistersMock(...args),
  },
}));

const renderScreen = () => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={["/pos/admin/transactions"]}>
        <PosTransactionsScreen />
      </MemoryRouter>
    </QueryClientProvider>
  );
};

describe("PosTransactionsScreen", () => {
  beforeEach(() => {
    listRegistersMock.mockResolvedValue({
      registers: [
        {
          registerId: "11111111-1111-1111-1111-111111111111",
          workspaceId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
          cashDrawerId: null,
          name: "Front Counter",
          defaultWarehouseId: null,
          defaultBankAccountId: null,
          status: "ACTIVE",
          createdAt: new Date("2026-03-25T10:00:00.000Z"),
          updatedAt: new Date("2026-03-25T10:00:00.000Z"),
        },
      ],
    });
  });

  it("renders transaction rows from the synced POS sales feed", async () => {
    listTransactionsMock.mockResolvedValue({
      items: [
        {
          transactionId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
          workspaceId: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
          sessionId: "cccccccc-cccc-4ccc-8ccc-cccccccccccc",
          registerId: "11111111-1111-1111-1111-111111111111",
          registerName: "Front Counter",
          receiptNumber: "POS-001",
          saleDate: new Date("2026-03-25T10:14:00.000Z"),
          cashierEmployeePartyId: "dddddddd-dddd-4ddd-8ddd-dddddddddddd",
          customerPartyId: null,
          subtotalCents: 2140,
          taxCents: 214,
          totalCents: 2354,
          currency: "EUR",
          status: "SYNCED",
          payments: [
            {
              paymentId: "eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee",
              method: "CASH",
              amountCents: 2354,
              reference: null,
            },
          ],
          syncedAt: new Date("2026-03-25T10:15:00.000Z"),
          createdAt: new Date("2026-03-25T10:14:00.000Z"),
        },
      ],
      pageInfo: { page: 1, pageSize: 20, total: 1, hasNextPage: false },
    });

    renderScreen();

    expect(await screen.findByText("POS-001")).toBeInTheDocument();
    expect(screen.getByText("Front Counter")).toBeInTheDocument();
    expect(screen.getByText("SYNCED")).toBeInTheDocument();
    expect(screen.getByText(/1 total/i)).toBeInTheDocument();
  });

  it("renders an empty state when the workspace has no synced sales", async () => {
    listTransactionsMock.mockResolvedValue({
      items: [],
      pageInfo: { page: 1, pageSize: 20, total: 0, hasNextPage: false },
    });

    renderScreen();

    expect(await screen.findByText("No synced POS transactions yet")).toBeInTheDocument();
    expect(
      screen.getByText("Once POS sales sync successfully, they appear here for operator review.")
    ).toBeInTheDocument();
  });
});
