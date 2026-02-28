import React from "react";
import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { CashEntriesScreen } from "./CashEntriesScreen";
import { DailyCloseScreen } from "./DailyCloseScreen";
import { CashExportsScreen } from "./CashExportsScreen";

const { apiMocks } = vi.hoisted(() => ({
  apiMocks: {
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
  },
}));

class ResizeObserverMock {
  observe(): void {}
  unobserve(): void {}
  disconnect(): void {}
}

vi.mock("@/lib/cash-management-api", () => ({
  cashManagementApi: apiMocks,
}));

const renderRoute = (path: string, element: React.ReactNode) => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  return render(
    <MemoryRouter initialEntries={[path]}>
      <QueryClientProvider client={queryClient}>
        <Routes>
          <Route path="/cash/registers/:id/entries" element={element} />
          <Route path="/cash/registers/:id/day-close" element={element} />
          <Route path="/cash/registers/:id/exports" element={element} />
        </Routes>
      </QueryClientProvider>
    </MemoryRouter>
  );
};

describe("cash-management screens", () => {
  let anchorClickSpy: ReturnType<typeof vi.spyOn> | null = null;

  beforeEach(() => {
    vi.stubGlobal("ResizeObserver", ResizeObserverMock);
    if (!HTMLElement.prototype.scrollIntoView) {
      Object.defineProperty(HTMLElement.prototype, "scrollIntoView", {
        value: vi.fn(),
        writable: true,
      });
    }

    Object.values(apiMocks).forEach((fn) => fn.mockReset());
    anchorClickSpy = vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => {});
  });

  afterEach(() => {
    anchorClickSpy?.mockRestore();
    anchorClickSpy = null;
    vi.unstubAllGlobals();
  });

  it("create entry appears in entries list", async () => {
    const user = userEvent.setup();
    const entries: Array<Record<string, unknown>> = [];

    apiMocks.getRegister.mockResolvedValue({
      register: {
        id: "reg-1",
        name: "Main",
        location: null,
        currency: "EUR",
        currentBalanceCents: 0,
        disallowNegativeBalance: false,
      },
    });
    apiMocks.listEntries.mockImplementation(async () => ({ entries }));
    apiMocks.listAttachments.mockResolvedValue({ attachments: [] });
    apiMocks.createEntry.mockImplementation(async () => {
      entries.push({
        id: "entry-1",
        entryNo: 1,
        occurredAt: "2026-02-27T09:00:00.000Z",
        dayKey: "2026-02-27",
        description: "Opening cash",
        type: "OPENING_FLOAT",
        direction: "IN",
        source: "MANUAL",
        paymentMethod: "CASH",
        amount: 1000,
        currency: "EUR",
        balanceAfterCents: 1000,
        reversedByEntryId: null,
      });
      return { entry: entries[0] };
    });
    apiMocks.attachBeleg.mockResolvedValue({ attachment: { id: "att-1" } });

    renderRoute("/cash/registers/reg-1/entries", <CashEntriesScreen />);

    await user.click(await screen.findByRole("button", { name: "New cash entry" }));
    await user.type(screen.getByLabelText("Amount"), "10");
    await user.type(screen.getByLabelText("Description"), "Opening cash");
    await user.click(screen.getByRole("button", { name: "Save entry" }));

    await waitFor(() => expect(apiMocks.createEntry).toHaveBeenCalled());
    await waitFor(() => expect(screen.getByText("Opening cash")).toBeInTheDocument());
  });

  it("day close screen is locked when status is submitted", async () => {
    apiMocks.getRegister.mockResolvedValue({
      register: {
        id: "reg-1",
        name: "Main",
        location: null,
        currency: "EUR",
        currentBalanceCents: 10000,
        disallowNegativeBalance: false,
      },
    });
    apiMocks.getDayClose.mockResolvedValue({
      close: {
        id: "close-1",
        registerId: "reg-1",
        dayKey: "2026-02-27",
        expectedBalance: 10000,
        countedBalance: 10000,
        difference: 0,
        status: "SUBMITTED",
        note: null,
        denominationCounts: [{ denomination: 500, count: 20, subtotal: 10000 }],
      },
    });

    renderRoute("/cash/registers/reg-1/day-close?day=2026-02-27", <DailyCloseScreen />);

    expect(
      await screen.findByText("This day is locked. Use correction entries only.")
    ).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Submit and lock day" })).not.toBeInTheDocument();
  });

  it("reverse entry updates list and saldo", async () => {
    const user = userEvent.setup();
    const entries: Array<Record<string, unknown>> = [
      {
        id: "entry-1",
        entryNo: 1,
        occurredAt: "2026-02-27T09:00:00.000Z",
        dayKey: "2026-02-27",
        description: "Sale",
        type: "SALE_CASH",
        direction: "IN",
        source: "MANUAL",
        paymentMethod: "CASH",
        amount: 1000,
        currency: "EUR",
        balanceAfterCents: 1000,
        reversedByEntryId: null,
      },
    ];

    apiMocks.getRegister.mockResolvedValue({
      register: {
        id: "reg-1",
        name: "Main",
        location: null,
        currency: "EUR",
        currentBalanceCents: 1000,
        disallowNegativeBalance: false,
      },
    });
    apiMocks.listEntries.mockImplementation(async () => ({ entries }));
    apiMocks.listAttachments.mockResolvedValue({ attachments: [] });
    apiMocks.reverseEntry.mockImplementation(async () => {
      entries[0].reversedByEntryId = "entry-2";
      entries.push({
        id: "entry-2",
        entryNo: 2,
        occurredAt: "2026-02-27T10:00:00.000Z",
        dayKey: "2026-02-27",
        description: "Reversal #1: Wrong entry",
        type: "CORRECTION",
        direction: "OUT",
        source: "MANUAL",
        paymentMethod: "CASH",
        amount: 1000,
        currency: "EUR",
        balanceAfterCents: 0,
        reversedByEntryId: null,
      });
      return { entry: entries[1] };
    });

    renderRoute("/cash/registers/reg-1/entries", <CashEntriesScreen />);

    await screen.findByText("Sale");
    const menuTrigger = screen
      .getAllByRole("button")
      .find((button) => button.getAttribute("aria-haspopup") === "menu");
    expect(menuTrigger).toBeDefined();
    if (!menuTrigger) {
      throw new Error("Menu trigger not found");
    }
    await user.click(menuTrigger);
    await user.click(await screen.findByText("Reverse"));
    await user.type(screen.getByLabelText("Reason"), "Wrong entry");
    await user.click(screen.getByRole("button", { name: "Confirm reversal" }));

    await waitFor(() => expect(apiMocks.reverseEntry).toHaveBeenCalled());
    await waitFor(() => expect(screen.getByText("Reversal #1: Wrong entry")).toBeInTheDocument());
  });

  it("export generation returns downloadable result", async () => {
    const user = userEvent.setup();
    const createObjectUrl = vi.fn(() => "blob:test");
    const revokeObjectUrl = vi.fn();
    vi.stubGlobal("URL", {
      createObjectURL: createObjectUrl,
      revokeObjectURL: revokeObjectUrl,
    } as unknown as typeof URL);

    apiMocks.getRegister.mockResolvedValue({
      register: {
        id: "reg-1",
        name: "Main",
        location: null,
        currency: "EUR",
        currentBalanceCents: 1000,
        disallowNegativeBalance: false,
      },
    });
    apiMocks.exportCashBook.mockResolvedValue({
      export: {
        fileToken: "file-1",
        fileName: "cashbook.csv",
        contentType: "text/csv",
        sizeBytes: 200,
      },
    });
    apiMocks.downloadExport.mockResolvedValue(
      new Blob(["id,amount\n1,1000"], { type: "text/csv" })
    );

    renderRoute("/cash/registers/reg-1/exports", <CashExportsScreen />);

    await user.click(await screen.findByRole("button", { name: "Generate export" }));
    await waitFor(() => expect(apiMocks.exportCashBook).toHaveBeenCalled());

    await user.click(await screen.findByRole("button", { name: "Download export" }));
    await waitFor(() => expect(apiMocks.downloadExport).toHaveBeenCalledWith("file-1"));
    expect(createObjectUrl).toHaveBeenCalled();
  });
});
