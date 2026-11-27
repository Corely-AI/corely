import React from "react";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { AppSidebar } from "./AppSidebar";
import { AppShell } from "./AppShell";

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
let surfaceIdState = "platform";
let tenantPermissionState = { canRead: false, canManage: false };
let paymentsEnabled = false;

vi.mock("react-i18next", async () => {
  const actual = await vi.importActual("react-i18next");
  return {
    ...actual,
    useTranslation: () => ({
      t: (key: string, options?: { defaultValue?: string }) => options?.defaultValue ?? key,
      i18n: { changeLanguage: vi.fn() },
    }),
  };
});

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
  useTaxCapabilitiesQuery: () => ({ data: { paymentsEnabled } }),
}));

vi.mock("@/shared/workspaces/WorkspaceSwitcher", () => ({
  WorkspaceSwitcher: () => <div data-testid="workspace-switcher" />,
}));

vi.mock("@/shared/components/Logo", () => ({
  Logo: () => <div data-testid="logo" />,
}));

vi.mock("@/modules/notifications/components/notification-bell", () => ({
  NotificationBell: () => <div data-testid="notification-bell" />,
}));

vi.mock("@/shared/utils/iconMapping", () => ({
  getIconByName: () => () => <span data-testid="icon" />,
}));

vi.mock("@/shared/lib/permissions", () => ({
  useCanReadTenants: () => ({
    can: tenantPermissionState.canRead,
    isLoading: false,
    error: null,
  }),
  useCanManageTenants: () => ({
    can: tenantPermissionState.canManage,
    isLoading: false,
    error: null,
  }),
}));

vi.mock("@corely/web-shared/shared/surface", () => ({
  useSurfaceId: () => surfaceIdState,
}));

describe("AppSidebar", () => {
  const originalScrollIntoView = Element.prototype.scrollIntoView;

  beforeAll(() => {
    Element.prototype.scrollIntoView = vi.fn();
    vi.stubGlobal(
      "ResizeObserver",
      class {
        observe() {}
        unobserve() {}
        disconnect() {}
      }
    );
  });

  afterAll(() => {
    Element.prototype.scrollIntoView = originalScrollIntoView;
    vi.unstubAllGlobals();
  });

  afterEach(cleanup);

  beforeEach(() => {
    surfaceIdState = "platform";
    tenantPermissionState = { canRead: false, canManage: false };
    paymentsEnabled = false;
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

  it.each([false, true])(
    "uses the same Tax payments visibility in the sidebar and palette (%s)",
    async (enabled) => {
      paymentsEnabled = enabled;
      render(
        <MemoryRouter initialEntries={["/tax"]}>
          <AppShell />
        </MemoryRouter>
      );

      expect(screen.queryAllByTestId("nav-tax-payments")).toHaveLength(enabled ? 2 : 0);
      expect(screen.getAllByTestId("nav-tax-filings")).toHaveLength(2);
      fireEvent.keyDown(window, { key: "k", ctrlKey: true });
      const palette = await screen.findByRole("dialog");
      expect(palette).toHaveTextContent("Filings");
      if (enabled) {
        expect(palette).toHaveTextContent("Payments");
      } else {
        expect(palette).not.toHaveTextContent("Payments");
      }
    }
  );

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

  it("hides platform admin links outside the platform surface", () => {
    surfaceIdState = "crm";
    tenantPermissionState = { canRead: true, canManage: true };

    render(
      <MemoryRouter>
        <AppSidebar />
      </MemoryRouter>
    );

    expect(screen.queryByTestId("nav-platform-tenants")).not.toBeInTheDocument();
    expect(screen.queryByTestId("nav-directory-restaurants")).not.toBeInTheDocument();
  });
});
