import React from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import type { AppShellProps } from "@corely/web-shared/layout/app-shell";
import type { WorkspaceNavigationGroup } from "@corely/contracts";
import { AppShell } from "./AppShell";

const fixture = vi.hoisted(() => ({ loading: false, error: null as Error | null, granted: true }));
const groups: WorkspaceNavigationGroup[] = [
  {
    id: "expenses",
    labelKey: "nav.expenses",
    defaultLabel: "Expenses",
    order: 1,
    items: [
      {
        id: "expenses",
        label: "Expenses",
        route: "/expenses",
        section: "expenses",
        icon: "Receipt",
        order: 1,
      },
    ],
  },
  {
    id: "invoices",
    labelKey: "nav.invoices",
    defaultLabel: "Invoices",
    order: 2,
    items: [
      {
        id: "invoices",
        label: "Invoices",
        route: "/invoices",
        section: "invoices",
        icon: "FileText",
        order: 1,
      },
    ],
  },
];
vi.mock("@corely/web-shared", () => ({
  AppShell: (props: AppShellProps) => (
    <>
      <nav>
        {(props.navigationGroups ?? groups)
          .flatMap((group) => group.items)
          .map((item) => (
            <a key={item.id} href={item.route}>
              {item.label}
            </a>
          ))}
      </nav>
      <div data-testid="admin-nav">{String(props.sidebarProps?.showPlatformAdminNav)}</div>
      {props.includeWorkspaceQuickActions !== false && <button>Unrelated quick action</button>}
      {props.topContent}
    </>
  ),
}));
vi.mock("./AppSidebar", () => ({ AppSidebar: () => null }));
vi.mock("@corely/web-shared/shared/workspaces/workspace-config-provider", () => ({
  useWorkspaceConfig: () => ({
    navigationGroups: fixture.granted ? groups : groups.filter((group) => group.id !== "expenses"),
    isLoading: fixture.loading,
    error: fixture.error,
  }),
}));
vi.mock("@corely/web-shared/shared/workspaces/workspace-provider", () => ({
  useWorkspace: () => ({ activeWorkspaceId: "workspace-a" }),
}));
vi.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (key: string) => key, i18n: { language: "de" } }),
}));
afterEach(() => {
  cleanup();
  vi.unstubAllEnvs();
  fixture.loading = false;
  fixture.error = null;
  fixture.granted = true;
});

function setup(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <AppShell />
    </MemoryRouter>
  );
}
describe("Expenses app navigation", () => {
  it("returns to the configured App Center with workspace and language, never credentials", () => {
    vi.stubEnv("VITE_CORELY_APP_CENTER_ORIGIN", "https://app.corely.test:8443");
    setup("/expenses");
    expect(screen.getByRole("link", { name: "Alle Apps" }).getAttribute("href")).toBe(
      "https://app.corely.test:8443/?workspaceId=workspace-a&lang=de"
    );
  });
  it("does not create a return link from an unsafe origin", () => {
    vi.stubEnv("VITE_CORELY_APP_CENTER_ORIGIN", "https://user:password@app.corely.test/path");
    setup("/expenses");
    expect(screen.queryByRole("link", { name: "Alle Apps" })).toBeNull();
  });
  it.each(["/expenses", "/expenses/new", "/expenses/expense-a", "/expenses/expense-a/edit"])(
    "keeps %s inside Expenses navigation",
    (path) => {
      setup(path);
      expect(screen.getByRole("link", { name: "Expenses" })).toBeTruthy();
      expect(screen.queryByRole("link", { name: "Invoices" })).toBeNull();
      expect(screen.queryByRole("button", { name: "Unrelated quick action" })).toBeNull();
      expect(screen.getByTestId("admin-nav").textContent).toBe("false");
    }
  );
  it.each(["/dashboard", "/invoices", "/expenses-other"])(
    "preserves broad navigation for %s",
    (path) => {
      setup(path);
      expect(screen.getByRole("link", { name: "Invoices" })).toBeTruthy();
    }
  );
  it.each(["loading", "error"] as const)("does not expose stale links while %s", (state) => {
    if (state === "loading") {
      fixture.loading = true;
    } else {
      fixture.error = new Error("Unavailable");
    }
    setup("/expenses");
    expect(screen.queryByRole("link", { name: "Expenses" })).toBeNull();
    expect(screen.queryByRole("link", { name: "Invoices" })).toBeNull();
  });
  it("does not add Expenses when the server grants no Expenses navigation", () => {
    fixture.granted = false;
    setup("/expenses");
    expect(screen.queryByRole("link", { name: "Expenses" })).toBeNull();
    expect(screen.queryByRole("link", { name: "Invoices" })).toBeNull();
  });
});
