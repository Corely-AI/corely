import React from "react";
import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { CashEntriesScreen } from "./CashEntriesScreen";
import { DailyCloseScreen } from "./DailyCloseScreen";
import { CashExportsScreen } from "./CashExportsScreen";
import { CreateEntryDialog, defaultCreateForm } from "./cash-entries-dialogs";

const { apiMocks, taxApiMocks, uploadMocks } = vi.hoisted(() => ({
  apiMocks: {
    getRegister: vi.fn(),
    listEntries: vi.fn(),
    listAttachments: vi.fn(),
    createEntry: vi.fn(),
    reverseEntry: vi.fn(),
    attachBeleg: vi.fn(),
    getDayClose: vi.fn(),
    getDashboard: vi.fn(),
    submitDayClose: vi.fn(),
    exportCashBook: vi.fn(),
    downloadExport: vi.fn(),
    downloadDocument: vi.fn(),
  },
  taxApiMocks: {
    getProfile: vi.fn(),
    listTaxCodes: vi.fn(),
    listTaxRates: vi.fn(),
    upsertProfile: vi.fn(),
  },
  uploadMocks: {
    uploadBelegDocument: vi.fn(),
  },
}));

class ResizeObserverMock {
  observe(): void {}
  unobserve(): void {}
  disconnect(): void {}
}

vi.mock("@corely/web-shared/lib/cash-management-api", () => ({
  cashManagementApi: apiMocks,
}));

vi.mock("@corely/web-shared/lib/tax-api", () => ({
  taxApi: taxApiMocks,
}));

vi.mock("../upload-beleg-document", () => ({
  uploadBelegDocument: uploadMocks.uploadBelegDocument,
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
    Object.values(taxApiMocks).forEach((fn) => fn.mockReset());
    Object.values(uploadMocks).forEach((fn) => fn.mockReset());
    taxApiMocks.getProfile.mockResolvedValue({ regime: "SMALL_BUSINESS" });
    taxApiMocks.listTaxCodes.mockResolvedValue([]);
    taxApiMocks.listTaxRates.mockResolvedValue([]);
    taxApiMocks.upsertProfile.mockResolvedValue({ regime: "STANDARD_VAT" });
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
        grossAmountCents: 1000,
        netAmountCents: 1000,
        taxAmountCents: 0,
        taxMode: "NONE",
        taxCodeId: null,
        taxCode: null,
        taxRateBps: null,
        taxLabel: null,
        amount: 1000,
        amountCents: 1000,
        currency: "EUR",
        balanceAfterCents: 1000,
        sourceDocumentId: null,
        sourceDocumentRef: null,
        sourceDocumentKind: null,
        reversedByEntryId: null,
      });
      return { entry: entries[0] };
    });
    apiMocks.attachBeleg.mockResolvedValue({ attachment: { id: "att-1" } });

    renderRoute("/cash/registers/reg-1/entries", <CashEntriesScreen />);

    await user.click(await screen.findByRole("button", { name: "New cash entry" }));
    await user.type(screen.getByLabelText("Gross amount"), "10");
    await user.type(screen.getByLabelText("Booking text"), "Opening cash");
    await user.type(screen.getByLabelText("Receipt reference / Eigenbeleg"), "EV-1");
    await user.click(screen.getByRole("button", { name: "Save entry" }));

    await waitFor(() => expect(apiMocks.createEntry).toHaveBeenCalled());
    await waitFor(() => expect(screen.getByText("Opening cash")).toBeInTheDocument());
  });

  it("create entry uploads and attaches a beleg file", async () => {
    const user = userEvent.setup();
    const file = new File(["receipt"], "receipt.pdf", { type: "application/pdf" });

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
    apiMocks.listEntries.mockResolvedValue({ entries: [] });
    apiMocks.listAttachments.mockResolvedValue({ attachments: [] });
    apiMocks.createEntry.mockResolvedValue({
      entry: {
        id: "entry-1",
      },
    });
    apiMocks.attachBeleg.mockResolvedValue({ attachment: { id: "att-1" } });
    uploadMocks.uploadBelegDocument.mockResolvedValue("doc-123");

    renderRoute("/cash/registers/reg-1/entries", <CashEntriesScreen />);

    await user.click(await screen.findByRole("button", { name: "New cash entry" }));
    await user.type(screen.getByLabelText("Gross amount"), "10");
    await user.type(screen.getByLabelText("Booking text"), "Opening cash");
    await user.upload(screen.getByLabelText("Attach beleg (optional)"), file);
    await user.click(screen.getByRole("button", { name: "Save entry" }));

    await waitFor(() => expect(uploadMocks.uploadBelegDocument).toHaveBeenCalledWith(file));
    await waitFor(() =>
      expect(apiMocks.attachBeleg).toHaveBeenCalledWith("entry-1", { documentId: "doc-123" })
    );
  });

  it("downloads beleg attachments from the entries list", async () => {
    const user = userEvent.setup();
    const clickSpy = vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => {});

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
    apiMocks.listEntries.mockResolvedValue({
      entries: [
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
          grossAmountCents: 1190,
          netAmountCents: 1000,
          taxAmountCents: 190,
          taxMode: "OUTPUT_VAT",
          taxCodeId: "tax-1",
          taxCode: "DE_STD_19",
          taxRateBps: 1900,
          taxLabel: "USt 19%",
          amount: 1190,
          amountCents: 1190,
          currency: "EUR",
          balanceAfterCents: 1190,
          sourceDocumentId: "doc-1",
          sourceDocumentRef: null,
          sourceDocumentKind: "ATTACHMENT",
          reversedByEntryId: null,
        },
      ],
    });
    apiMocks.listAttachments.mockResolvedValue({
      attachments: [
        {
          id: "att-1",
          tenantId: "tenant-1",
          workspaceId: "ws-1",
          entryId: "entry-1",
          documentId: "doc-1",
          uploadedBy: "user-1",
          createdAt: "2026-02-27T09:00:00.000Z",
        },
      ],
    });
    apiMocks.downloadDocument.mockResolvedValue(new Blob(["receipt"], { type: "application/pdf" }));

    renderRoute("/cash/registers/reg-1/entries", <CashEntriesScreen />);

    await user.click(await screen.findByRole("button", { name: "Download beleg" }));

    await waitFor(() => expect(apiMocks.downloadDocument).toHaveBeenCalledWith("doc-1"));
    clickSpy.mockRestore();
  });

  it("attach beleg dialog uploads a file instead of asking for a document id", async () => {
    const user = userEvent.setup();
    const file = new File(["receipt"], "receipt.jpg", { type: "image/jpeg" });

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
    apiMocks.listEntries.mockResolvedValue({
      entries: [
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
          grossAmountCents: 1190,
          netAmountCents: 1000,
          taxAmountCents: 190,
          taxMode: "OUTPUT_VAT",
          taxCodeId: "tax-1",
          taxCode: "DE_STD_19",
          taxRateBps: 1900,
          taxLabel: "USt 19%",
          amount: 1190,
          amountCents: 1190,
          currency: "EUR",
          balanceAfterCents: 1190,
          sourceDocumentId: null,
          sourceDocumentRef: null,
          sourceDocumentKind: null,
          reversedByEntryId: null,
        },
      ],
    });
    apiMocks.listAttachments.mockResolvedValue({ attachments: [] });
    apiMocks.attachBeleg.mockResolvedValue({ attachment: { id: "att-1" } });
    uploadMocks.uploadBelegDocument.mockResolvedValue("doc-attach-1");

    renderRoute("/cash/registers/reg-1/entries", <CashEntriesScreen />);

    await user.click(await screen.findByRole("button", { name: "Open actions" }));
    await user.click(await screen.findByRole("menuitem", { name: "Add beleg" }));

    expect(screen.queryByLabelText("Document ID")).not.toBeInTheDocument();
    await user.upload(screen.getByLabelText("Receipt file"), file);
    await user.click(screen.getByRole("button", { name: "Attach" }));

    await waitFor(() => expect(uploadMocks.uploadBelegDocument).toHaveBeenCalledWith(file));
    await waitFor(() =>
      expect(apiMocks.attachBeleg).toHaveBeenCalledWith("entry-1", { documentId: "doc-attach-1" })
    );
  });

  it("requires tax setup before saving a cash sale when no profile exists", async () => {
    const user = userEvent.setup();

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
    apiMocks.listEntries.mockResolvedValue({ entries: [] });
    apiMocks.listAttachments.mockResolvedValue({ attachments: [] });
    taxApiMocks.getProfile.mockResolvedValue(null);

    renderRoute("/cash/registers/reg-1/entries", <CashEntriesScreen />);

    await user.click(await screen.findByRole("button", { name: "New cash entry" }));

    expect(await screen.findByText("Tax setup required")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Use standard German VAT" })).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Use Kleinunternehmer (No VAT)" })
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Save entry" })).toBeDisabled();

    await user.click(screen.getByRole("button", { name: "Use standard German VAT" }));

    await waitFor(() =>
      expect(taxApiMocks.upsertProfile).toHaveBeenCalledWith(
        expect.objectContaining({
          country: "DE",
          regime: "STANDARD_VAT",
          currency: "EUR",
          filingFrequency: "MONTHLY",
          vatAccountingMethod: "IST",
        })
      )
    );
  });

  it("stops the camera stream after capturing a receipt photo", async () => {
    const user = userEvent.setup();
    const stop = vi.fn();
    const getUserMedia = vi.fn().mockResolvedValue({
      getTracks: () => [{ stop }],
    });
    const originalMediaDevices = navigator.mediaDevices;
    const originalSrcObject = Object.getOwnPropertyDescriptor(
      HTMLMediaElement.prototype,
      "srcObject"
    );

    Object.defineProperty(navigator, "mediaDevices", {
      configurable: true,
      value: { getUserMedia },
    });
    Object.defineProperty(HTMLMediaElement.prototype, "srcObject", {
      configurable: true,
      get() {
        return (this as HTMLMediaElement & { __srcObject?: MediaStream }).__srcObject ?? null;
      },
      set(value) {
        (this as HTMLMediaElement & { __srcObject?: MediaStream | null }).__srcObject =
          value as MediaStream | null;
      },
    });
    vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockImplementation(
      () => ({ drawImage: vi.fn() }) as unknown as CanvasRenderingContext2D
    );
    vi.spyOn(HTMLCanvasElement.prototype, "toBlob").mockImplementation((callback: BlobCallback) =>
      callback(new Blob(["receipt"], { type: "image/jpeg" }))
    );

    const setForm = vi.fn();
    render(
      <CreateEntryDialog
        open
        onOpenChange={() => undefined}
        form={defaultCreateForm()}
        setForm={setForm}
        entryTypes={["SALE_CASH"]}
        entryTypeLabel={(value) => value}
        taxCodeOptions={[]}
        taxRelevant={false}
        requiresTaxProfileSetup={false}
        isTaxProfileSetupPending={false}
        onUseStandardVat={() => undefined}
        onUseSmallBusiness={() => undefined}
        taxCodeRequired={false}
        taxCodeLabel="VAT"
        registerCurrency="EUR"
        projectedBalance={0}
        isPending={false}
        isError={false}
        canSave={false}
        onSave={() => undefined}
      />
    );

    await user.click(screen.getByRole("button", { name: "Take picture" }));
    await waitFor(() => expect(getUserMedia).toHaveBeenCalled());
    await user.click(screen.getByRole("button", { name: "Capture photo" }));

    await waitFor(() => expect(stop).toHaveBeenCalled());

    if (originalMediaDevices) {
      Object.defineProperty(navigator, "mediaDevices", {
        configurable: true,
        value: originalMediaDevices,
      });
    }
    if (originalSrcObject) {
      Object.defineProperty(HTMLMediaElement.prototype, "srcObject", originalSrcObject);
    }
  });

  it("stops the camera stream when the dialog closes", async () => {
    const user = userEvent.setup();
    const stop = vi.fn();
    const getUserMedia = vi.fn().mockResolvedValue({
      getTracks: () => [{ stop }],
    });
    const originalMediaDevices = navigator.mediaDevices;
    const originalSrcObject = Object.getOwnPropertyDescriptor(
      HTMLMediaElement.prototype,
      "srcObject"
    );

    Object.defineProperty(navigator, "mediaDevices", {
      configurable: true,
      value: { getUserMedia },
    });
    Object.defineProperty(HTMLMediaElement.prototype, "srcObject", {
      configurable: true,
      get() {
        return (this as HTMLMediaElement & { __srcObject?: MediaStream }).__srcObject ?? null;
      },
      set(value) {
        (this as HTMLMediaElement & { __srcObject?: MediaStream | null }).__srcObject =
          value as MediaStream | null;
      },
    });

    const setForm = vi.fn();
    const view = render(
      <CreateEntryDialog
        open
        onOpenChange={() => undefined}
        form={defaultCreateForm()}
        setForm={setForm}
        entryTypes={["SALE_CASH"]}
        entryTypeLabel={(value) => value}
        taxCodeOptions={[]}
        taxRelevant={false}
        requiresTaxProfileSetup={false}
        isTaxProfileSetupPending={false}
        onUseStandardVat={() => undefined}
        onUseSmallBusiness={() => undefined}
        taxCodeRequired={false}
        taxCodeLabel="VAT"
        registerCurrency="EUR"
        projectedBalance={0}
        isPending={false}
        isError={false}
        canSave={false}
        onSave={() => undefined}
      />
    );

    await user.click(screen.getByRole("button", { name: "Take picture" }));
    await waitFor(() => expect(getUserMedia).toHaveBeenCalled());

    view.rerender(
      <CreateEntryDialog
        open={false}
        onOpenChange={() => undefined}
        form={defaultCreateForm()}
        setForm={setForm}
        entryTypes={["SALE_CASH"]}
        entryTypeLabel={(value) => value}
        taxCodeOptions={[]}
        taxRelevant={false}
        requiresTaxProfileSetup={false}
        isTaxProfileSetupPending={false}
        onUseStandardVat={() => undefined}
        onUseSmallBusiness={() => undefined}
        taxCodeRequired={false}
        taxCodeLabel="VAT"
        registerCurrency="EUR"
        projectedBalance={0}
        isPending={false}
        isError={false}
        canSave={false}
        onSave={() => undefined}
      />
    );

    await waitFor(() => expect(stop).toHaveBeenCalled());

    if (originalMediaDevices) {
      Object.defineProperty(navigator, "mediaDevices", {
        configurable: true,
        value: originalMediaDevices,
      });
    }
    if (originalSrcObject) {
      Object.defineProperty(HTMLMediaElement.prototype, "srcObject", originalSrcObject);
    }
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
        grossAmountCents: 1000,
        netAmountCents: 1000,
        taxAmountCents: 0,
        taxMode: "NONE",
        taxCodeId: null,
        taxCode: null,
        taxRateBps: null,
        taxLabel: null,
        amount: 1000,
        amountCents: 1000,
        currency: "EUR",
        balanceAfterCents: 1000,
        sourceDocumentId: null,
        sourceDocumentRef: null,
        sourceDocumentKind: null,
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
        grossAmountCents: 1000,
        netAmountCents: 1000,
        taxAmountCents: 0,
        taxMode: "NONE",
        taxCodeId: null,
        taxCode: null,
        taxRateBps: null,
        taxLabel: null,
        amount: 1000,
        amountCents: 1000,
        currency: "EUR",
        balanceAfterCents: 0,
        sourceDocumentId: null,
        sourceDocumentRef: null,
        sourceDocumentKind: null,
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
