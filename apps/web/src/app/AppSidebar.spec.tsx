import React from "react";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it, vi, beforeEach } from "vitest";
import { AppSidebar } from "./AppSidebar";

let navigationGroupsState = [
  {
    id: "tax",
    defaultLabel: "Tax",
    items: [
      {
        id: "tax-filings",
        label: "Filings",
        route: "/tax/filings",
        icon: "Files",
      },
      {
        id: "tax-payments",
        label: "Payments",
        route: "/tax/payments",
        icon: "CreditCard",
      },
    ],
  },
];

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string) => key,
    i18n: { changeLanguage: vi.fn() },
  }),
}));

vi.mock("@/shared/theme/themeStore", () => ({
  useThemeStore: () => ({ theme: "light", setTheme: vi.fn() }),
}));

vi.mock("@/lib/auth-provider", () => ({
  useAuth: () => ({ user: { name: "Test User", email: "test@example.com" }, logout: vi.fn() }),
}));

vi.mock("@/shared/workspaces/workspace-provider", () => ({
  useWorkspace: () => ({ activeWorkspace: { name: "Acme" } }),
}));

vi.mock("@/shared/workspaces/workspace-config-provider", () => ({
  useWorkspaceConfig: () => ({
    isLoading: false,
    error: null,
    navigationGroups: navigationGroupsState,
  }),
}));

vi.mock("@/modules/tax/hooks/useTaxCapabilitiesQuery", () => ({
  useTaxCapabilitiesQuery: () => ({ data: { paymentsEnabled: false } }),
}));

vi.mock("@/shared/workspaces/WorkspaceSwitcher", () => ({
  WorkspaceSwitcher: () => <div data-testid="workspace-switcher" />,
}));

vi.mock("@/shared/components/Logo", () => ({
  Logo: () => <div data-testid="logo" />,
}));

vi.mock("@/shared/workspaces/WorkspaceTypeBadge", () => ({
  WorkspaceTypeBadge: () => <div data-testid="workspace-type" />,
}));

vi.mock("@/shared/utils/iconMapping", () => ({
  getIconByName: () => () => <span data-testid="icon" />,
}));

vi.mock("@/shared/lib/permissions", () => ({
  useCanReadTenants: () => ({ can: false, isLoading: false, error: null }),
}));

describe("AppSidebar", () => {
  beforeEach(() => {
    navigationGroupsState = [
      {
        id: "tax",
        defaultLabel: "Tax",
        items: [
          {
            id: "tax-filings",
            label: "Filings",
            route: "/tax/filings",
            icon: "Files",
          },
          {
            id: "tax-payments",
            label: "Payments",
            route: "/tax/payments",
            icon: "CreditCard",
          },
        ],
      },
    ];
  });

  it("hides tax payments when payments are disabled", () => {
    render(
      <MemoryRouter>
        <AppSidebar />
      </MemoryRouter>
    );

    expect(screen.queryByTestId("nav-tax-payments")).not.toBeInTheDocument();
    expect(screen.getByTestId("nav-tax-filings")).toBeInTheDocument();
  });

  it("keeps import shipments menu active on shipment detail deep links", () => {
    navigationGroupsState = [
      {
        id: "import",
        defaultLabel: "Import",
        items: [
          {
            id: "import-shipments",
            label: "Shipments",
            route: "/import/shipments",
            icon: "Package",
          },
        ],
      },
    ];

    render(
      <MemoryRouter initialEntries={["/import/shipments/shp_123"]}>
        <AppSidebar />
      </MemoryRouter>
    );

    expect(screen.getByTestId("nav-import-shipments")).toHaveClass("bg-sidebar-accent");
  });
});
