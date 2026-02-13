import React from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import NewShipmentPage from "./NewShipmentPage";

const navigateMock = vi.fn();
const createShipmentMock = vi.fn();
const listCustomersMock = vi.fn();
const listItemsMock = vi.fn();
const listUomsMock = vi.fn();
const createCustomerMock = vi.fn();
const createItemMock = vi.fn();

let permissionsState = {
  allowAll: false,
  allowed: [
    "import.shipments.read",
    "import.shipments.manage",
    "party.customers.read",
    "party.customers.manage",
    "catalog.read",
    "catalog.write",
  ],
  denied: [],
};

let capabilityState: Record<string, boolean> = {
  "workspace.rbac": true,
  "import.basic": true,
  "catalog.basic": true,
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

vi.mock("@/lib/customers-api", () => ({
  customersApi: {
    listCustomers: (...args: unknown[]) => listCustomersMock(...args),
    createCustomer: (...args: unknown[]) => createCustomerMock(...args),
  },
}));

vi.mock("@/lib/catalog-api", () => ({
  catalogApi: {
    listItems: (...args: unknown[]) => listItemsMock(...args),
    listUoms: (...args: unknown[]) => listUomsMock(...args),
    createItem: (...args: unknown[]) => createItemMock(...args),
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
  afterEach(() => {
    cleanup();
  });

  beforeEach(() => {
    navigateMock.mockReset();
    createShipmentMock.mockReset();
    listCustomersMock.mockReset();
    listItemsMock.mockReset();
    listUomsMock.mockReset();
    createCustomerMock.mockReset();
    createItemMock.mockReset();
    permissionsState = {
      allowAll: false,
      allowed: [
        "import.shipments.read",
        "import.shipments.manage",
        "party.customers.read",
        "party.customers.manage",
        "catalog.read",
        "catalog.write",
      ],
      denied: [],
    };
    capabilityState = {
      "workspace.rbac": true,
      "import.basic": true,
      "catalog.basic": true,
    };

    listCustomersMock.mockResolvedValue({
      customers: [{ id: "sup_1", displayName: "Acme Supplier" }],
      nextCursor: null,
    });
    listItemsMock.mockResolvedValue({
      items: [],
      pageInfo: { page: 1, pageSize: 200, total: 0, hasNextPage: false },
    });
    listUomsMock.mockResolvedValue({
      items: [{ id: "uom_1", code: "PCS", name: "Pieces" }],
      pageInfo: { page: 1, pageSize: 100, total: 1, hasNextPage: false },
    });
    createShipmentMock.mockResolvedValue({
      id: "shp_123",
      status: "DRAFT",
    });
    createCustomerMock.mockResolvedValue({
      id: "sup_2",
      displayName: "Created Supplier",
    });
    createItemMock.mockResolvedValue({
      item: {
        id: "prd_1",
        code: "P-001",
        name: "Created Product",
        hsCode: null,
      },
    });
  });

  it("shows access message and hides create action for read-only users", async () => {
    permissionsState = {
      allowAll: false,
      allowed: ["import.shipments.read"],
      denied: ["import.shipments.manage"],
    };

    renderPage();

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

    expect(await screen.findByRole("button", { name: "Create Draft" })).toBeInTheDocument();

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

  it("shows empty-state create actions when suppliers and products are missing", async () => {
    listCustomersMock.mockResolvedValue({ customers: [], nextCursor: null });
    listItemsMock.mockResolvedValue({
      items: [],
      pageInfo: { page: 1, pageSize: 200, total: 0, hasNextPage: false },
    });

    renderPage();

    expect(await screen.findByText("No suppliers found.")).toBeInTheDocument();
    expect(await screen.findByRole("button", { name: "Create supplier" })).toBeInTheDocument();
    expect(await screen.findByText("No products found.")).toBeInTheDocument();
    expect(await screen.findByRole("button", { name: "Create product" })).toBeInTheDocument();
  });

  it("creates a supplier from empty state and makes it selectable", async () => {
    const user = userEvent.setup();
    listCustomersMock.mockReset();
    createCustomerMock.mockResolvedValueOnce({
      id: "sup_new",
      displayName: "Northwind Traders",
    });
    listCustomersMock
      .mockResolvedValueOnce({ customers: [], nextCursor: null })
      .mockResolvedValueOnce({
        customers: [{ id: "sup_new", displayName: "Northwind Traders" }],
        nextCursor: null,
      })
      .mockResolvedValue({
        customers: [{ id: "sup_new", displayName: "Northwind Traders" }],
        nextCursor: null,
      });

    renderPage();

    await user.click((await screen.findAllByRole("button", { name: "Create supplier" }))[0]);
    await user.type(screen.getByLabelText("Supplier name"), "Northwind Traders");
    await user.click(
      within(screen.getByRole("dialog")).getByRole("button", { name: "Create supplier" })
    );

    await waitFor(() => {
      expect(createCustomerMock).toHaveBeenCalledWith({
        displayName: "Northwind Traders",
        role: "SUPPLIER",
      });
    });

    await waitFor(() => {
      expect((screen.getByLabelText("Supplier") as HTMLSelectElement).value).toBe("sup_new");
    });
  });

  it("creates a product from line empty state and uses it in shipment lines", async () => {
    const user = userEvent.setup();
    listItemsMock.mockReset();
    listItemsMock
      .mockResolvedValueOnce({
        items: [],
        pageInfo: { page: 1, pageSize: 200, total: 0, hasNextPage: false },
      })
      .mockResolvedValueOnce({
        items: [{ id: "prd_new", name: "Premium Tea", code: "TEA-001", hsCode: null }],
        pageInfo: { page: 1, pageSize: 200, total: 1, hasNextPage: false },
      });
    createItemMock.mockResolvedValueOnce({
      item: { id: "prd_new", name: "Premium Tea", code: "TEA-001", hsCode: null },
    });

    renderPage();

    await user.click(screen.getByRole("button", { name: "Add line" }));
    await user.click((await screen.findAllByRole("button", { name: "Create product" }))[0]);
    await user.type(screen.getByLabelText("Product name"), "Premium Tea");
    await user.type(screen.getByLabelText("SKU / Code"), "TEA-001");
    await user.click(
      within(screen.getByRole("dialog")).getByRole("button", { name: "Create product" })
    );

    await waitFor(() => {
      expect(createItemMock).toHaveBeenCalledWith(
        expect.objectContaining({
          code: "TEA-001",
          name: "Premium Tea",
          type: "PRODUCT",
          defaultUomId: "uom_1",
        })
      );
    });

    const orderedQtyInput = document.querySelector('input[name="lines.0.orderedQty"]');
    expect(orderedQtyInput).toBeTruthy();
    await user.clear(orderedQtyInput as HTMLInputElement);
    await user.type(orderedQtyInput as HTMLInputElement, "1");
    await user.click(screen.getAllByRole("button", { name: "Create Draft" })[0]);

    await waitFor(() => {
      expect(createShipmentMock).toHaveBeenCalledWith(
        expect.objectContaining({
          lines: [expect.objectContaining({ productId: "prd_new" })],
        })
      );
    });
  });

  it("shows permission-specific access guidance when supplier/product read permissions are missing", async () => {
    permissionsState = {
      allowAll: false,
      allowed: ["import.shipments.read", "import.shipments.manage"],
      denied: ["party.customers.read", "catalog.read"],
    };

    renderPage();

    expect(
      (await screen.findAllByText("You don't have access to suppliers. Ask an admin for access."))
        .length
    ).toBeGreaterThan(0);
    expect(
      (await screen.findAllByText("You don't have access to products. Ask an admin for access."))
        .length
    ).toBeGreaterThan(0);
  });
});
