import React from "react";
import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes, useLocation } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { TaxPaymentsPage } from "./TaxPaymentsPage";

let capabilitiesState = {
  data: { paymentsEnabled: true },
  isLoading: false,
  isError: false,
  refetch: vi.fn(),
};

let paymentsState = {
  data: {
    items: [],
    pageInfo: { page: 1, pageSize: 20, total: 0, hasNextPage: false },
  },
  isLoading: false,
  isError: false,
  refetch: vi.fn(),
};

vi.mock("@/lib/tax-api", () => ({
  taxApi: {
    exportPayments: vi.fn().mockResolvedValue({ csv: "" }),
    markFilingPaid: vi.fn().mockResolvedValue({}),
    attachPaymentProof: vi.fn().mockResolvedValue({}),
  },
}));

vi.mock("../hooks/useTaxCapabilitiesQuery", () => ({
  useTaxCapabilitiesQuery: () => capabilitiesState,
}));

vi.mock("../hooks/useTaxPaymentsQuery", () => ({
  useTaxPaymentsQuery: () => paymentsState,
}));

const LocationDisplay = () => {
  const location = useLocation();
  return <div data-testid="location">{location.pathname}</div>;
};

const renderPage = (initialEntry: string) => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[initialEntry]}>
        <Routes>
          <Route path="/tax/payments" element={<TaxPaymentsPage />} />
          <Route path="/tax/filings" element={<div>Filings</div>} />
        </Routes>
        <LocationDisplay />
      </MemoryRouter>
    </QueryClientProvider>
  );
};

describe("TaxPaymentsPage", () => {
  beforeEach(() => {
    capabilitiesState = {
      data: { paymentsEnabled: true },
      isLoading: false,
      isError: false,
      refetch: vi.fn(),
    };
    paymentsState = {
      data: {
        items: [],
        pageInfo: { page: 1, pageSize: 20, total: 0, hasNextPage: false },
      },
      isLoading: false,
      isError: false,
      refetch: vi.fn(),
    };
  });

  it("redirects to filings when payments are disabled", async () => {
    capabilitiesState = {
      data: { paymentsEnabled: false },
      isLoading: false,
      isError: false,
      refetch: vi.fn(),
    };

    renderPage("/tax/payments");

    expect(await screen.findByText("Filings")).toBeInTheDocument();
    expect(screen.getByTestId("location")).toHaveTextContent("/tax/filings");
  });

  it("renders empty state when there are no payments", async () => {
    renderPage("/tax/payments");

    expect(await screen.findByText("No payments to track")).toBeInTheDocument();
    expect(screen.getByText("Go to filings")).toBeInTheDocument();
  });
});
