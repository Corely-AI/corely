import React from "react";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { FilingDetailPage } from "./FilingDetailPage";
import type { TaxFilingDetailResponse } from "@corely/contracts";

const getFilingDetailMock = vi.fn();
const listFilingItemsMock = vi.fn();
const listFilingAttachmentsMock = vi.fn();
const listFilingActivityMock = vi.fn();
const submitFilingMock = vi.fn();
const recalculateFilingMock = vi.fn();
const markFilingPaidMock = vi.fn();
const getVatFilingPeriodsMock = vi.fn();

vi.mock("@corely/web-shared/lib/tax-api", () => ({
  taxApi: {
    getFilingDetail: (...args: unknown[]) => getFilingDetailMock(...args),
    listFilingItems: (...args: unknown[]) => listFilingItemsMock(...args),
    listFilingAttachments: (...args: unknown[]) => listFilingAttachmentsMock(...args),
    listFilingActivity: (...args: unknown[]) => listFilingActivityMock(...args),
    submitFiling: (...args: unknown[]) => submitFilingMock(...args),
    recalculateFiling: (...args: unknown[]) => recalculateFilingMock(...args),
    markFilingPaid: (...args: unknown[]) => markFilingPaidMock(...args),
    deleteFiling: vi.fn(),
    getReportPdfUrl: vi.fn(),
    getVatFilingPeriods: (...args: unknown[]) => getVatFilingPeriodsMock(...args),
  },
}));

vi.mock("../hooks/useTaxMode", () => ({
  useTaxMode: () => ({ mode: "FREELANCER", isFreelancer: true, isCompany: false }),
}));

const renderPage = (initialEntry: string) => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
    },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[initialEntry]}>
        <Routes>
          <Route path="/tax/filings/:id" element={<FilingDetailPage />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>
  );
};

const buildFilingResponse = (
  overrides?: Partial<TaxFilingDetailResponse["filing"]>
): TaxFilingDetailResponse => ({
  filing: {
    id: "filing-1",
    type: "vat",
    status: "draft",
    periodLabel: "2026 Q1",
    periodKey: "2026-Q1",
    year: 2026,
    periodStart: "2026-01-01T00:00:00.000Z",
    periodEnd: "2026-03-31T23:59:59.999Z",
    dueDate: "2026-04-10T00:00:00.000Z",
    totals: {
      vatCollectedCents: 190000,
      vatPaidCents: 12000,
      netPayableCents: 178000,
      currency: "EUR",
      lastRecalculatedAt: "2026-03-01T10:00:00.000Z",
      salesCount: 3,
      purchaseCount: 2,
      salesNetCents: 1000000,
      purchaseNetCents: 200000,
      grossIncomeCents: null,
      deductibleExpensesCents: null,
      netProfitCents: null,
      estimatedTaxDueCents: null,
    },
    issues: [],
    capabilities: {
      canDelete: true,
      canRecalculate: true,
      canSubmit: true,
      canMarkPaid: false,
      paymentsEnabled: true,
      submissionMethods: ["manual", "api"],
      submissionConnectionStatus: "notConfigured",
    },
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-03-01T12:00:00.000Z",
    ...overrides,
  },
});

describe("FilingDetailPage", () => {
  beforeEach(() => {
    getFilingDetailMock.mockReset();
    listFilingItemsMock.mockReset();
    listFilingAttachmentsMock.mockReset();
    listFilingActivityMock.mockReset();
    submitFilingMock.mockReset();
    recalculateFilingMock.mockReset();
    markFilingPaidMock.mockReset();
    getVatFilingPeriodsMock.mockReset();

    getFilingDetailMock.mockResolvedValue(buildFilingResponse());
    listFilingItemsMock.mockResolvedValue({
      items: [
        {
          id: "snapshot-1",
          sourceType: "invoice",
          sourceId: "inv-1",
          date: "2026-02-12T00:00:00.000Z",
          counterparty: "Acme GmbH",
          category: "Services",
          vatTreatment: "standard",
          netCents: 100000,
          taxCents: 19000,
          grossCents: 119000,
          net: 100000,
          vat: 19000,
          gross: 119000,
          flags: { needsAttention: false, missingCategory: false, missingTaxTreatment: false },
          deepLink: "/invoices/inv-1",
        },
      ],
      pageInfo: { page: 1, pageSize: 10, total: 12, hasNextPage: true },
    });
    listFilingAttachmentsMock.mockResolvedValue({ items: [] });
    listFilingActivityMock.mockResolvedValue({ events: [] });
    submitFilingMock.mockResolvedValue(buildFilingResponse({ status: "submitted" }));
    recalculateFilingMock.mockResolvedValue(buildFilingResponse());
    markFilingPaidMock.mockResolvedValue(buildFilingResponse({ status: "paid" }));
    getVatFilingPeriodsMock.mockResolvedValue({
      year: 2026,
      frequency: "quarterly",
      periods: [
        {
          periodKey: "2025-Q4",
          label: "Q4",
          from: "2025-10-01T00:00:00.000Z",
          to: "2025-12-31T23:59:59.999Z",
          dueDate: "2026-01-10T00:00:00.000Z",
          filingId: "filing-0",
          status: "submitted",
        },
        {
          periodKey: "2026-Q1",
          label: "Q1",
          from: "2026-01-01T00:00:00.000Z",
          to: "2026-03-31T23:59:59.999Z",
          dueDate: "2026-04-10T00:00:00.000Z",
          filingId: "filing-1",
          status: "draft",
        },
        {
          periodKey: "2026-Q2",
          label: "Q2",
          from: "2026-04-01T00:00:00.000Z",
          to: "2026-06-30T23:59:59.999Z",
          dueDate: "2026-07-10T00:00:00.000Z",
          filingId: null,
          status: null,
        },
      ],
    });
  });

  it("renders header and stepper", async () => {
    renderPage("/tax/filings/filing-1");

    expect(await screen.findByText("VAT Filing — 2026 Q1")).toBeInTheDocument();
    const stepper = screen.getByTestId("tax-filing-stepper");
    expect(within(stepper).getByText("Review")).toBeInTheDocument();
    expect(within(stepper).getByText("Submit")).toBeInTheDocument();
    expect(within(stepper).getByText("Pay")).toBeInTheDocument();
    expect(await screen.findByText("Included items")).toBeInTheDocument();
    expect(screen.getByText("No issues detected.")).toBeInTheDocument();
  });

  it("changes primary action by status", async () => {
    getFilingDetailMock.mockResolvedValueOnce(
      buildFilingResponse({
        status: "submitted",
        capabilities: {
          canDelete: false,
          canRecalculate: false,
          canSubmit: false,
          canMarkPaid: true,
          paymentsEnabled: true,
          submissionMethods: ["manual"],
          submissionConnectionStatus: "notConfigured",
        },
      })
    );

    renderPage("/tax/filings/filing-1");
    expect(await screen.findByRole("button", { name: "Mark paid" })).toBeInTheDocument();
  });

  it("submits confirmation and calls submit endpoint", async () => {
    const user = userEvent.setup();
    renderPage("/tax/filings/filing-1");

    const submitStepButton = await screen.findByRole("button", { name: /submit/i });
    await user.click(submitStepButton);

    const submitStep = await screen.findByTestId("tax-filing-submit-step");
    const submissionInput = within(submitStep).getByPlaceholderText(
      "Enter submission ID/reference"
    );
    await user.type(submissionInput, "SUB-001");

    await user.click(within(submitStep).getByRole("button", { name: "Submit filing" }));

    await waitFor(() => expect(submitFilingMock).toHaveBeenCalled());
    expect(submitFilingMock).toHaveBeenCalledWith(
      "filing-1",
      expect.objectContaining({ submissionId: "SUB-001", method: "manual" })
    );
  });

  it("supports embedded included-items presets, search, and pagination", async () => {
    const user = userEvent.setup();
    renderPage("/tax/filings/filing-1");

    await screen.findByText("Included items");

    const reviewStep = screen.getByTestId("tax-filing-review-step");
    await user.click(
      within(reviewStep).getByRole("button", { name: /sales \/ invoices included/i })
    );
    await user.click(within(reviewStep).getByRole("button", { name: "View included items" }));

    await waitFor(() => {
      expect(listFilingItemsMock).toHaveBeenCalledWith(
        "filing-1",
        expect.objectContaining({ sourceType: "invoice" })
      );
    });

    const searchBox = screen.getByRole("searchbox");
    await user.clear(searchBox);
    await user.type(searchBox, "Acme");

    await waitFor(() => {
      expect(listFilingItemsMock).toHaveBeenLastCalledWith(
        "filing-1",
        expect.objectContaining({ q: "Acme" })
      );
    });

    const nextPage = screen.getByLabelText("Go to next page");
    await user.click(nextPage);
    await waitFor(() => {
      expect(listFilingItemsMock).toHaveBeenLastCalledWith(
        "filing-1",
        expect.objectContaining({ page: 2 })
      );
    });
  });
});
