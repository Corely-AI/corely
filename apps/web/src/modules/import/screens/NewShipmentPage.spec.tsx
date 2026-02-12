import React from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import NewShipmentPage from "./NewShipmentPage";

const navigateMock = vi.fn();
const createShipmentMock = vi.fn();
const listSuppliersMock = vi.fn();
const listItemsMock = vi.fn();

let permissionsState = {
  allowAll: false,
  allowed: ["import.shipments.read", "import.shipments.manage"],
  denied: [],
};

let capabilityState: Record<string, boolean> = {
  "workspace.rbac": true,
  "import.basic": true,
};

vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual("react-router-dom");
  return {
    ...actual,
    useNavigate: () => navigateMock,
  };
});

vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

vi.mock("@/lib/import-shipments-api", () => ({
  importShipmentsApi: {
    createShipment: (...args: unknown[]) => createShipmentMock(...args),
  },
}));

vi.mock("@/lib/purchasing-api", () => ({
  purchasingApi: {
    listSuppliers: (...args: unknown[]) => listSuppliersMock(...args),
  },
}));

vi.mock("@/lib/catalog-api", () => ({
  catalogApi: {
    listItems: (...args: unknown[]) => listItemsMock(...args),
  },
}));

vi.mock("@/shared/workspaces/workspace-config-provider", () => ({
  useWorkspaceConfig: () => ({
    hasCapability: (key: string) => Boolean(capabilityState[key]),
    isLoading: false,
  }),
}));

vi.mock("@/shared/lib/permissions", () => ({
  useEffectivePermissions: () => ({
    data: { permissions: permissionsState },
    isLoading: false,
  }),
  hasPermission: (permissions: typeof permissionsState | undefined, key: string) => {
    if (!permissions) {
      return false;
    }
    if (permissions.denied.includes(key)) {
      return false;
    }
    if (permissions.allowAll) {
      return true;
    }
    return permissions.allowed.includes(key);
  },
}));

const renderPage = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
    },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <NewShipmentPage />
      </MemoryRouter>
    </QueryClientProvider>
  );
};

describe("NewShipmentPage", () => {
  beforeEach(() => {
    navigateMock.mockReset();
    createShipmentMock.mockReset();
    listSuppliersMock.mockReset();
    listItemsMock.mockReset();
    permissionsState = {
      allowAll: false,
      allowed: ["import.shipments.read", "import.shipments.manage"],
      denied: [],
    };
    capabilityState = {
      "workspace.rbac": true,
      "import.basic": true,
    };

    listSuppliersMock.mockResolvedValue({
      suppliers: [{ id: "sup_1", displayName: "Acme Supplier" }],
      nextCursor: null,
    });
    listItemsMock.mockResolvedValue({
      items: [],
      pageInfo: { page: 1, pageSize: 200, total: 0, hasNextPage: false },
    });
    createShipmentMock.mockResolvedValue({
      id: "shp_123",
      status: "DRAFT",
    });
  });

  it("shows access message and hides create action for read-only users", async () => {
    permissionsState = {
      allowAll: false,
      allowed: ["import.shipments.read"],
      denied: ["import.shipments.manage"],
    };

    renderPage();

    await waitFor(() => {
      expect(listSuppliersMock).toHaveBeenCalled();
    });

    expect(
      await screen.findByText(
        "You don't have access to create import shipments. Contact an admin to request access."
      )
    ).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Create Draft" })).not.toBeInTheDocument();
  });

  it("creates a draft shipment and redirects to detail", async () => {
    const user = userEvent.setup();
    renderPage();

    await waitFor(() => {
      expect(listSuppliersMock).toHaveBeenCalled();
    });

    await user.click(screen.getAllByRole("button", { name: "Create Draft" })[0]);

    await waitFor(() => {
      expect(createShipmentMock).toHaveBeenCalledWith(
        expect.objectContaining({
          supplierPartyId: "sup_1",
          lines: [],
        })
      );
    });

    await waitFor(() => {
      expect(navigateMock).toHaveBeenCalledWith("/import/shipments/shp_123");
    });
  });
});
