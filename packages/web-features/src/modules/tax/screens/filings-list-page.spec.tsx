import React from "react";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes, useLocation } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { FilingsListPage } from "./FilingsListPage";
import type { TaxFilingsListQuery } from "@corely/contracts";

const navigateMock = vi.fn();
const listFilingsMock = vi.fn();

const vatPeriodsData = {
  year: 2025,
  frequency: "quarterly",
  periods: [
    {
      periodKey: "2025-Q1",
      label: "Q1 2025",
      from: "2025-01-01T00:00:00.000Z",
      to: "2025-04-01T00:00:00.000Z",
      dueDate: "2025-04-10T00:00:00.000Z",
      filingId: "filing-q1",
      status: "draft",
    },
    {
      periodKey: "2025-Q2",
      label: "Q2 2025",
      from: "2025-04-01T00:00:00.000Z",
      to: "2025-07-01T00:00:00.000Z",
      dueDate: "2025-07-10T00:00:00.000Z",
      filingId: null,
      status: null,
    },
    {
      periodKey: "2025-Q3",
      label: "Q3 2025",
      from: "2025-07-01T00:00:00.000Z",
      to: "2025-10-01T00:00:00.000Z",
      dueDate: "2025-10-10T00:00:00.000Z",
      filingId: "filing-q3",
      status: "submitted",
    },
    {
      periodKey: "2025-Q4",
      label: "Q4 2025",
      from: "2025-10-01T00:00:00.000Z",
      to: "2026-01-01T00:00:00.000Z",
      dueDate: "2026-01-10T00:00:00.000Z",
      filingId: null,
      status: null,
    },
  ],
};

vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual("react-router-dom");
  return {
    ...(actual as Record<string, unknown>),
    useNavigate: () => navigateMock,
  };
});

vi.mock("@corely/web-shared/shared/workspaces/workspace-provider", () => ({
  useWorkspace: () => ({ activeWorkspace: { legalEntityId: "entity-1" } }),
}));

vi.mock("@corely/web-shared/lib/tax-api", () => ({
  taxApi: {
    listFilings: (...args: unknown[]) => listFilingsMock(...args),
  },
}));

vi.mock("../hooks/useVatPeriodsQuery", () => ({
  useVatPeriodsQuery: () => ({
    data: vatPeriodsData,
    isLoading: false,
    isError: false,
    refetch: vi.fn(),
  }),
}));

const LocationDisplay = () => {
  const location = useLocation();
  return (
    <div data-testid="location">
      {location.pathname}
      {location.search}
    </div>
  );
};

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
          <Route
            path="/tax/filings"
            element={
              <>
                <FilingsListPage />
                <LocationDisplay />
              </>
            }
          />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>
  );
};

describe("FilingsListPage", () => {
  beforeEach(() => {
    listFilingsMock.mockReset();
    navigateMock.mockReset();
    listFilingsMock.mockResolvedValue({
      items: [],
      pageInfo: { page: 1, pageSize: 20, total: 0, hasNextPage: false },
    });
  });

  it("renders VAT tab with year switcher and period chips for 2025", async () => {
    renderPage("/tax/filings?tab=vat&year=2025");

    expect(await screen.findByText("VAT")).toBeInTheDocument();
    expect(screen.getByText("2025")).toBeInTheDocument();
    expect(screen.getByText("Q1 2025")).toBeInTheDocument();
    expect(screen.getByText("Q2 2025")).toBeInTheDocument();
    expect(screen.getByText("Q3 2025")).toBeInTheDocument();
    expect(screen.getByText("Q4 2025")).toBeInTheDocument();
  });

  it("selecting Q2 updates URL and filters the table", async () => {
    const user = userEvent.setup();
    listFilingsMock.mockImplementation(async (input: TaxFilingsListQuery) => ({
      items:
        input.periodKey === "2025-Q2"
          ? [
              {
                id: "filing-q2",
                type: "vat",
                periodLabel: "Q2 2025",
                periodKey: "2025-Q2",
                dueDate: "2025-07-10T00:00:00.000Z",
                status: "draft",
                amountCents: 10000,
                currency: "EUR",
              },
            ]
          : [],
      pageInfo: { page: 1, pageSize: 20, total: 0, hasNextPage: false },
    }));

    renderPage("/tax/filings?tab=vat&year=2025&periodKey=2025-Q1");

    const navigator = screen.getAllByTestId("vat-period-navigator")[0];
    await user.click(within(navigator).getByRole("button", { name: /Q2 2025/i }));

    await waitFor(() =>
      expect(
        screen
          .getAllByTestId("location")
          .some((node) => node.textContent?.includes("periodKey=2025-Q2"))
      ).toBe(true)
    );
    await waitFor(() =>
      expect(listFilingsMock).toHaveBeenCalledWith(
        expect.objectContaining({ periodKey: "2025-Q2" })
      )
    );
  });

  it("clicking a missing period navigates to the create route", async () => {
    const user = userEvent.setup();
    renderPage("/tax/filings?tab=vat&year=2025&periodKey=2025-Q1");

    const navigator = screen.getAllByTestId("vat-period-navigator")[0];
    await user.click(within(navigator).getByRole("button", { name: /Q2 2025/i }));

    expect(navigateMock).toHaveBeenCalledWith(
      "/tax/filings/new?type=vat&periodKey=2025-Q2&year=2025"
    );
  });

  it("annual tab shows empty state CTA without filtering by year", async () => {
    listFilingsMock.mockResolvedValueOnce({
      items: [],
      pageInfo: { page: 1, pageSize: 20, total: 0, hasNextPage: false },
    });

    renderPage("/tax/filings?tab=income-annual&year=2025");

    await waitFor(() =>
      expect(listFilingsMock).toHaveBeenCalledWith(
        expect.objectContaining({ type: "income-annual", year: undefined })
      )
    );

    expect(await screen.findByRole("button", { name: "Create annual filing" })).toBeInTheDocument();
  });
});
