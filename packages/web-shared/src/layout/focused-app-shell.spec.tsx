import React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import "@testing-library/jest-dom/vitest";
import { MemoryRouter, useLocation } from "react-router-dom";
import { mockDeep } from "vitest-mock-extended";
import { SessionContext, type BrowserSessionContext } from "../session/session-context";
import { FocusedAppShell, type FocusedAppShellProps } from "./focused-app-shell";
import { SessionClient } from "../session/session-client";
import { useFocusedShellData } from "./use-focused-shell-data";
import { shellConfig } from "../../testkit/browser/focused-shell-fixture";

vi.mock("./use-focused-shell-data", () => ({ useFocusedShellData: vi.fn() }));
let data: ReturnType<typeof useFocusedShellData>;
function Location() {
  return <span data-testid="route">{useLocation().pathname}</span>;
}
function setup(props: Partial<FocusedAppShellProps> = {}) {
  const session: BrowserSessionContext = mockDeep<BrowserSessionContext>();
  session.client = new SessionClient({
    appKey: "invoice",
    tenantId: "tenant",
    workspaceId: "synthetic-workspace",
  });
  session.state = {
    status: "authenticated",
    session: {
      appKey: "invoice",
      csrfToken: "a".repeat(43),
      expiresAt: "2099-01-01T00:00:00Z",
      user: { userId: "user", name: "Alex", email: "alex@example.invalid", memberships: [] },
    },
  };
  render(
    <SessionContext.Provider value={session}>
      <MemoryRouter initialEntries={["/invoices"]}>
        <FocusedAppShell
          app="invoice"
          label="Invoice"
          routeRoots={["/invoices", "/audit"]}
          appCenterOrigin="https://app.corely.one"
          workspace={{ id: "synthetic-workspace", name: "Studio Linden" }}
          actions={[
            { id: "invoice", label: "New invoice", menuItemId: "invoices", route: "/invoices/new" },
            { id: "hr", label: "New HR profile", menuItemId: "invoices", route: "/people/new" },
            { id: "accounting", label: "Accounting", menuItemId: "invoices", route: "/accounting" },
          ]}
          {...props}
        >
          <p>Protected app content</p>
          <Location />
        </FocusedAppShell>
      </MemoryRouter>
    </SessionContext.Provider>
  );
  return { session, user: userEvent.setup() };
}
beforeEach(() => {
  Element.prototype.scrollIntoView = vi.fn();
  globalThis.ResizeObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  };
  data = mockDeep<ReturnType<typeof useFocusedShellData>>();
  data.ready = true;
  data.navigation.data = shellConfig("invoice");
  data.navigation.isPending = false;
  data.navigation.isError = false;
  data.launches.isPending = false;
  data.launches.isError = false;
  data.launches.data = [];
  vi.mocked(useFocusedShellData).mockReturnValue(data);
});
afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe("focused shell", () => {
  it("keeps sidebar, quick-create and keyboard commands inside the app", async () => {
    const { user } = setup();
    expect(screen.getByRole("button", { name: "New invoice" })).toBeVisible();
    expect(screen.queryByText("New HR profile")).toBeNull();
    expect(screen.queryByText("Accounting")).toBeNull();
    await user.keyboard("{Control>}k{/Control}");
    expect(await screen.findByRole("dialog", { name: "Command palette" })).toBeVisible();
    await user.type(screen.getByPlaceholderText("Search commands..."), "New invoice");
    await user.keyboard("{ArrowDown}{Enter}");
    await waitFor(() => expect(screen.getByTestId("route")).toHaveTextContent("/invoices/new"));
    expect(screen.queryByRole("dialog")).toBeNull();
  });
  it("requires a decision before dirty form navigation, then preserves or changes the route", async () => {
    const { user } = setup({ isDirty: true });
    await user.click(screen.getByRole("button", { name: "New invoice" }));
    expect(screen.getByRole("alertdialog")).toHaveTextContent("unsaved changes");
    await user.click(screen.getByRole("button", { name: "Stay" }));
    expect(screen.getByTestId("route")).toHaveTextContent(/^\/invoices$/);
    await user.click(screen.getByRole("button", { name: "New invoice" }));
    await user.click(screen.getByRole("button", { name: "Leave page" }));
    expect(screen.getByTestId("route")).toHaveTextContent("/invoices/new");
  });
  it("traps mobile navigation focus and closes on Escape", async () => {
    const { user } = setup();
    const trigger = screen.getByRole("button", { name: "Navigation" });
    await user.click(trigger);
    expect(screen.getByRole("dialog")).toBeVisible();
    await user.keyboard("{Escape}");
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
    await waitFor(() => expect(trigger).toHaveFocus());
  });
  it("renders empty and error states without exposing children or create commands", () => {
    data.navigation.data = { ...shellConfig("invoice"), navigation: { groups: [] } };
    setup();
    expect(screen.getByRole("status")).toHaveTextContent("No available pages");
    expect(screen.queryByText("Protected app content")).toBeNull();
    expect(screen.queryByRole("button", { name: "New invoice" })).toBeNull();
  });
  it("does not render stale content after a failed configuration refresh", () => {
    data.navigation.isError = true;
    setup();
    expect(screen.getByRole("alert")).toHaveTextContent("Navigation is unavailable");
    expect(screen.queryByText("Protected app content")).toBeNull();
  });
  it("shows a keyboard accessible no-access app switcher", async () => {
    const { user } = setup();
    await user.click(screen.getByRole("button", { name: "Switch apps" }));
    expect(await screen.findByText("No other apps are available.")).toBeVisible();
    await user.keyboard("{Escape}");
    await waitFor(() => expect(screen.getByRole("button", { name: "Switch apps" })).toHaveFocus());
  });
});
