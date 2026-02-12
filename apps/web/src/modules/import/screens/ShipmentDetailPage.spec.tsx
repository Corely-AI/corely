import React from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import ShipmentDetailPage from "./ShipmentDetailPage";

const getShipmentMock = vi.fn();

vi.mock("@/lib/import-shipments-api", () => ({
  importShipmentsApi: {
    getShipment: (...args: unknown[]) => getShipmentMock(...args),
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
          <Route path="/import/shipments/:id" element={<ShipmentDetailPage />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>
  );
};

describe("ShipmentDetailPage", () => {
  beforeEach(() => {
    getShipmentMock.mockReset();
  });

  it("does not fetch shipment detail for the reserved 'new' route segment", async () => {
    renderPage("/import/shipments/new");

    expect(await screen.findByText("Shipment not found")).toBeInTheDocument();
    expect(getShipmentMock).not.toHaveBeenCalled();
  });
});
