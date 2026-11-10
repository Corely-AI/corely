import React from "react";
import { describe, expect, it, vi } from "vitest";
import { render, cleanup } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { LegacyInvoiceObservation } from "./legacy-invoice-observation";
const observe = vi.hoisted(() => vi.fn());
vi.mock("@corely/web-shared/session/focused-observation", () => ({ observeFocused: observe }));
describe("legacy invoice usage diagnostics", () => {
  it.each(["/invoices", "/sales/invoices/new", "/invoices/private-id/edit?token=private-token"])(
    "counts retained entry %s without its link contents",
    (entry) => {
      observe.mockClear();
      render(
        <MemoryRouter initialEntries={[entry]}>
          <LegacyInvoiceObservation />
        </MemoryRouter>
      );
      expect(observe).toHaveBeenCalledWith({
        surface: "legacy",
        layer: "browser",
        event: "legacy-link",
        outcome: "ok",
      });
      expect(JSON.stringify(observe.mock.calls)).not.toMatch(/private|token|invoices/);
      cleanup();
    }
  );
  it.each([
    "/invoices/public/private-token",
    "/invoices/public",
    "/booking/private-token",
    "/auth/callback?code=private-proof",
    "/people/private-id",
  ])("does not classify public or unrelated entry %s as legacy Invoice", (entry) => {
    observe.mockClear();
    render(
      <MemoryRouter initialEntries={[entry]}>
        <LegacyInvoiceObservation />
      </MemoryRouter>
    );
    expect(observe).not.toHaveBeenCalled();
    cleanup();
  });
});
