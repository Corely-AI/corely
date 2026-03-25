import { describe, expect, it } from "vitest";
import { buildRestaurantAiTools } from "../adapters/tools/restaurant.tools";
import type { RestaurantAiApplication } from "../application/restaurant-ai.application";

const baseApp = {
  getFloorPlan: async () => ({
    rooms: [
      {
        id: "room-1",
        tenantId: "tenant-1",
        workspaceId: "workspace-1",
        name: "Main floor",
        sortOrder: 0,
        createdAt: "2026-03-24T10:00:00.000Z",
        updatedAt: "2026-03-24T10:00:00.000Z",
        tables: [
          {
            id: "table-1",
            tenantId: "tenant-1",
            workspaceId: "workspace-1",
            diningRoomId: "room-1",
            name: "T1",
            capacity: 4,
            posX: null,
            posY: null,
            shape: "SQUARE" as const,
            availabilityStatus: "AVAILABLE" as const,
            createdAt: "2026-03-24T10:00:00.000Z",
            updatedAt: "2026-03-24T10:00:00.000Z",
            activeSessionId: null,
            activeOrderId: null,
          },
          {
            id: "table-9",
            tenantId: "tenant-1",
            workspaceId: "workspace-1",
            diningRoomId: "room-1",
            name: "T9",
            capacity: 6,
            posX: null,
            posY: null,
            shape: "SQUARE" as const,
            availabilityStatus: "AVAILABLE" as const,
            createdAt: "2026-03-24T10:00:00.000Z",
            updatedAt: "2026-03-24T10:00:00.000Z",
            activeSessionId: null,
            activeOrderId: null,
          },
        ],
      },
    ],
  }),
  getActiveOrderByTable: async () => null,
  getOrderById: async () => ({
    session: {
      id: "session-1",
      tenantId: "tenant-1",
      workspaceId: "workspace-1",
      tableId: "table-1",
      registerId: "register-1",
      shiftSessionId: "shift-1",
      openedByUserId: "user-1",
      openedAt: "2026-03-24T10:00:00.000Z",
      closedAt: null,
      status: "OPEN" as const,
      transferCount: 0,
      createdAt: "2026-03-24T10:00:00.000Z",
      updatedAt: "2026-03-24T10:00:00.000Z",
    },
    order: {
      id: "order-1",
      tenantId: "tenant-1",
      workspaceId: "workspace-1",
      tableSessionId: "session-1",
      tableId: "table-1",
      status: "DRAFT" as const,
      subtotalCents: 0,
      discountCents: 0,
      taxCents: 0,
      totalCents: 0,
      sentAt: null,
      paidAt: null,
      closedAt: null,
      items: [],
      payments: [],
      createdAt: "2026-03-24T10:00:00.000Z",
      updatedAt: "2026-03-24T10:00:00.000Z",
    },
  }),
  listKitchenTickets: async () => ({
    items: [
      {
        id: "ticket-1",
        tenantId: "tenant-1",
        workspaceId: "workspace-1",
        orderId: "order-1",
        tableSessionId: "session-1",
        tableId: "table-1",
        stationId: "station-1",
        status: "IN_PROGRESS" as const,
        sentAt: "2026-03-24T10:00:00.000Z",
        updatedAt: "2026-03-24T10:20:00.000Z",
        items: [],
      },
    ],
    pageInfo: {
      page: 1,
      pageSize: 50,
      total: 1,
      hasNextPage: false,
    },
  }),
  listApprovalRequests: async () => [
    {
      id: "approval-1",
      tenantId: "tenant-1",
      workspaceId: "workspace-1",
      orderId: "order-1",
      orderItemId: "item-1",
      type: "VOID" as const,
      status: "PENDING" as const,
      reason: "Wrong item entered",
      amountCents: null,
      workflowInstanceId: "wf-1",
      requestedByUserId: "user-1",
      decidedByUserId: null,
      decidedAt: null,
      createdAt: "2026-03-24T10:05:00.000Z",
      updatedAt: "2026-03-24T10:05:00.000Z",
    },
  ],
} satisfies Partial<RestaurantAiApplication>;

const getTool = (name: string) => {
  const tool = buildRestaurantAiTools(baseApp as RestaurantAiApplication).find(
    (item) => item.name === name
  );
  expect(tool).toBeDefined();
  return tool!;
};

describe("restaurant ai tools", () => {
  it("builds a priced draft order proposal with modifiers", async () => {
    const tool = getTool("restaurant_buildOrderDraft");
    const result = await tool.execute?.({
      tenantId: "tenant-1",
      workspaceId: "workspace-1",
      userId: "user-1",
      input: {
        sourceText: "2 margherita extra cheese",
        orderId: "order-1",
        tableId: "table-1",
        catalogProducts: [
          {
            productId: "550e8400-e29b-41d4-a716-446655440001",
            sku: "PIZZA-MARG",
            name: "Margherita",
            barcode: null,
            priceCents: 1200,
            taxable: true,
            status: "ACTIVE",
            estimatedQty: 10,
          },
        ],
        modifierGroups: [
          {
            id: "group-1",
            tenantId: "tenant-1",
            workspaceId: "workspace-1",
            name: "Extras",
            selectionMode: "MULTI",
            isRequired: false,
            sortOrder: 0,
            linkedCatalogItemIds: ["550e8400-e29b-41d4-a716-446655440001"],
            options: [
              {
                id: "opt-1",
                name: "Extra cheese",
                priceDeltaCents: 200,
                sortOrder: 0,
              },
            ],
            createdAt: "2026-03-24T10:00:00.000Z",
            updatedAt: "2026-03-24T10:00:00.000Z",
          },
        ],
        floorPlanRooms: [],
      },
    });

    expect(result).toMatchObject({
      cardType: "restaurant.order-proposal",
      action: { actionType: "REPLACE_DRAFT" },
    });
    if (result && typeof result === "object" && "action" in result) {
      const action = result.action as { items?: Array<{ quantity: number; modifiers: unknown[] }> };
      expect(action.items?.[0]?.quantity).toBe(2);
      expect(action.items?.[0]?.modifiers).toHaveLength(1);
    }
  });

  it("returns explicit ambiguity instead of guessing a menu item", async () => {
    const tool = getTool("restaurant_buildOrderDraft");
    const result = await tool.execute?.({
      tenantId: "tenant-1",
      workspaceId: "workspace-1",
      userId: "user-1",
      input: {
        sourceText: "1 piz",
        orderId: "order-1",
        tableId: "table-1",
        catalogProducts: [
          {
            productId: "550e8400-e29b-41d4-a716-446655440001",
            sku: "PIZZA-MARG",
            name: "Margherita",
            barcode: null,
            priceCents: 1200,
            taxable: true,
            status: "ACTIVE",
            estimatedQty: 10,
          },
          {
            productId: "550e8400-e29b-41d4-a716-446655440002",
            sku: "PIZZA-PEP",
            name: "Pepperoni",
            barcode: null,
            priceCents: 1300,
            taxable: true,
            status: "ACTIVE",
            estimatedQty: 9,
          },
        ],
        modifierGroups: [],
        floorPlanRooms: [],
      },
    });

    expect(result).toMatchObject({
      cardType: "restaurant.order-proposal",
      action: { actionType: "NOOP" },
    });
    if (result && typeof result === "object" && "ambiguities" in result) {
      expect((result.ambiguities as unknown[]).length).toBeGreaterThan(0);
    }
  });

  it("drafts a void request proposal but does not expose approval/finalization tools", async () => {
    const tool = getTool("restaurant_draftVoidRequest");
    const result = await tool.execute?.({
      tenantId: "tenant-1",
      workspaceId: "workspace-1",
      userId: "user-1",
      input: {
        orderId: "order-1",
        orderItemId: "item-1",
        itemName: "Fries",
        reason: "Guest changed their mind",
      },
    });

    expect(result).toMatchObject({
      cardType: "restaurant.order-proposal",
      action: { actionType: "REQUEST_VOID" },
    });

    const toolNames = buildRestaurantAiTools(baseApp as RestaurantAiApplication).map(
      (item) => item.name
    );
    expect(toolNames).not.toContain("restaurant_approveVoid");
    expect(toolNames).not.toContain("restaurant_finalizeSale");
    expect(toolNames).not.toContain("restaurant_closeTable");
  });

  it("summarizes manager approvals and shift-close anomalies", async () => {
    const approvalsTool = getTool("restaurant_summarizeManagerApprovals");
    const approvals = await approvalsTool.execute?.({
      tenantId: "tenant-1",
      workspaceId: "workspace-1",
      userId: "user-1",
      input: { includeApplied: false },
    });
    expect(approvals).toMatchObject({
      cardType: "restaurant.approval-summary",
    });

    const shiftTool = getTool("restaurant_summarizeShiftClose");
    const shiftSummary = await shiftTool.execute?.({
      tenantId: "tenant-1",
      workspaceId: "workspace-1",
      userId: "user-1",
      input: {
        expectedCashCents: 20000,
        countedCashCents: 19400,
        openTables: 1,
        sentOrders: 5,
        unpaidOrders: 2,
        pendingApprovals: 0,
      },
    });

    expect(shiftSummary).toMatchObject({
      cardType: "restaurant.shift-close-summary",
      metrics: { pendingApprovals: 1 },
    });
    if (shiftSummary && typeof shiftSummary === "object" && "anomalies" in shiftSummary) {
      expect((shiftSummary.anomalies as string[]).some((item) => item.includes("variance"))).toBe(
        true
      );
    }
  });
});
