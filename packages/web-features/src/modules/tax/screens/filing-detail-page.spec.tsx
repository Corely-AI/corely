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

vi.mock("@corely/web-shared/lib/tax-api", () => ({
  taxApi: {
    getFilingDetail: (...args: unknown[]) => getFilingDetailMock(...args),
    listFilingItems: (...args: unknown[]) => listFilingItemsMock(...args),
    listFilingAttachments: (...args: unknown[]) => listFilingAttachmentsMock(...args),
    listFilingActivity: (...args: unknown[]) => listFilingActivityMock(...args),
    submitFiling: (...args: unknown[]) => submitFilingMock(...args),
    recalculateFiling: vi.fn(),
    markFilingPaid: vi.fn(),
    deleteFiling: vi.fn(),
    getReportPdfUrl: vi.fn(),
  },
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

describe("FilingDetailPage", () => {
  beforeEach(() => {
    getFilingDetailMock.mockReset();
    listFilingItemsMock.mockReset();
    listFilingAttachmentsMock.mockReset();
    listFilingActivityMock.mockReset();
    submitFilingMock.mockReset();

    const response: TaxFilingDetailResponse = {
      filing: {
        id: "filing-1",
        type: "income-annual",
        status: "draft",
        periodLabel: "2025",
        year: 2025,
        periodStart: "2025-01-01T00:00:00.000Z",
        periodEnd: "2025-12-31T00:00:00.000Z",
        dueDate: "2026-05-31T00:00:00.000Z",
        totals: {
          grossIncomeCents: 100000,
          deductibleExpensesCents: 20000,
          netProfitCents: 80000,
          estimatedTaxDueCents: null,
          currency: "EUR",
          lastRecalculatedAt: null,
        },
        issues: [],
        capabilities: {
          canDelete: true,
          canRecalculate: true,
          canSubmit: true,
          canMarkPaid: false,
          paymentsEnabled: false,
        },
      },
    };

    getFilingDetailMock.mockResolvedValue(response);
    listFilingItemsMock.mockResolvedValue({
      items: [],
      pageInfo: { page: 1, pageSize: 10, total: 0, hasNextPage: false },
    });
    listFilingAttachmentsMock.mockResolvedValue({ items: [] });
    listFilingActivityMock.mockResolvedValue({ events: [] });
    submitFilingMock.mockResolvedValue(response);
  });

  it("renders header and stepper", async () => {
    renderPage("/tax/filings/filing-1");

    expect(await screen.findByText("Income Tax Filing — 2025")).toBeInTheDocument();
    const stepper = screen.getByTestId("tax-filing-stepper");
    expect(within(stepper).getByText("Review")).toBeInTheDocument();
    expect(within(stepper).getByText("Submit")).toBeInTheDocument();
  });

  it("shows primary action based on status", async () => {
    renderPage("/tax/filings/filing-1");
    const stepper = await screen.findByTestId("tax-filing-stepper");
    expect(within(stepper).getByText("Review")).toBeInTheDocument();
  });

  it("renders income sources accordion and toggles items", async () => {
    const user = userEvent.setup();
    renderPage("/tax/filings/filing-1");

    const trigger = await screen.findByRole("button", { name: /income sources included/i });
    await user.click(trigger);

    // Verify items query was triggered for income
    await waitFor(() => {
      expect(listFilingItemsMock).toHaveBeenCalledWith(
        "filing-1",
        expect.objectContaining({ sourceType: "income" })
      );
    });
  });

  it("submits confirmation in submit step", async () => {
    const user = userEvent.setup();
    getFilingDetailMock.mockResolvedValueOnce({
      filing: {
        id: "filing-1",
        type: "income-annual",
        status: "submitted",
        periodLabel: "2025",
        year: 2025,
        periodStart: "2025-01-01T00:00:00.000Z",
        periodEnd: "2025-12-31T00:00:00.000Z",
        dueDate: "2026-05-31T00:00:00.000Z",
        totals: {
          grossIncomeCents: 100000,
          deductibleExpensesCents: 20000,
          netProfitCents: 80000,
          estimatedTaxDueCents: null,
          currency: "EUR",
          lastRecalculatedAt: null,
        },
        issues: [],
        capabilities: {
          canDelete: true,
          canRecalculate: true,
          canSubmit: true,
          canMarkPaid: false,
          paymentsEnabled: false,
        },
      },
    });
    renderPage("/tax/filings/filing-1");

    const submitStep = await screen.findByTestId("tax-filing-submit-step");
    const submissionInput = within(submitStep).getByPlaceholderText(
      "Enter submission ID/reference"
    );
    await user.type(submissionInput, "SUB-001");

    await user.click(within(submitStep).getByRole("button", { name: "Submit" }));

    await waitFor(() => expect(submitFilingMock).toHaveBeenCalled());
  });
});
