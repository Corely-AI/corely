import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { CashDashboardScreen } from "./CashDashboardScreen";

const renderDashboard = (path: string) => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
    },
  });

  return render(
    <MemoryRouter initialEntries={[path]}>
      <QueryClientProvider client={queryClient}>
        <CashDashboardScreen />
      </QueryClientProvider>
    </MemoryRouter>
  );
};

describe("cash dashboard", () => {
  it("shows open-day blockers with missing receipts", () => {
    renderDashboard("/dashboard?preview=1&state=open");

    expect(screen.getByText("Today's cash book is still open")).toBeInTheDocument();
    expect(screen.getByText("3 receipts are missing")).toBeInTheDocument();
    expect(screen.getByText("3 entries are missing receipts")).toBeInTheDocument();
  });

  it("shows a ready-to-close state when counted cash matches", () => {
    renderDashboard("/dashboard?preview=1&state=ready");

    expect(screen.getByText("You can close the day now")).toBeInTheDocument();
    expect(screen.getAllByText("Ready to close").length).toBeGreaterThan(0);
    expect(screen.getAllByRole("link", { name: "Close today's cash book" }).length).toBeGreaterThan(
      0
    );
  });

  it("shows export-ready messaging after the day is closed", () => {
    renderDashboard("/dashboard?preview=1&state=closed");

    expect(screen.getByText("This month is ready to export")).toBeInTheDocument();
    expect(screen.getAllByText("Export ready").length).toBeGreaterThan(0);
    expect(
      screen.getAllByRole("link", { name: "Export for Steuerberater" }).length
    ).toBeGreaterThan(0);
  });
});
