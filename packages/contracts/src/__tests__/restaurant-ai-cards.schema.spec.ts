import { describe, expect, it } from "vitest";
import {
  RestaurantBuildOrderDraftInputSchema,
  RestaurantOrderProposalCardSchema,
  RestaurantShiftCloseSummaryCardSchema,
} from "../restaurant-ai";

describe("restaurant ai card schemas", () => {
  it("parses a replace-draft order proposal card", () => {
    const card = RestaurantOrderProposalCardSchema.parse({
      ok: true,
      cardType: "restaurant.order-proposal",
      title: "Draft order proposal",
      summary: "Prepared 3 items for the draft order.",
      action: {
        actionType: "REPLACE_DRAFT",
        orderId: "order-1",
        tableId: "table-1",
        discountCents: 0,
        items: [
          {
            catalogItemId: "catalog-1",
            itemName: "Margherita",
            sku: "PIZZA-MARG",
            quantity: 2,
            unitPriceCents: 1200,
            taxRateBps: 700,
            modifiers: [],
          },
        ],
      },
      ambiguities: [],
      missingRequiredModifiers: [],
      confidence: 0.91,
      rationale: "Matched against the POS menu snapshot.",
      provenance: {
        sourceText: "2 margherita",
        extractedFields: ["items"],
      },
    });

    expect(card.action.actionType).toBe("REPLACE_DRAFT");
    if (card.action.actionType === "REPLACE_DRAFT") {
      expect(card.action.items[0]?.itemName).toBe("Margherita");
    }
  });

  it("accepts build-order-draft input with product snapshots and modifier groups", () => {
    const input = RestaurantBuildOrderDraftInputSchema.parse({
      sourceText: "1 steak medium rare",
      tableId: "table-1",
      orderId: "order-1",
      modifierGroups: [
        {
          id: "group-1",
          tenantId: "tenant-1",
          workspaceId: "workspace-1",
          name: "Cook",
          selectionMode: "SINGLE",
          isRequired: true,
          sortOrder: 0,
          linkedCatalogItemIds: ["catalog-1"],
          options: [{ id: "opt-1", name: "Medium rare", priceDeltaCents: 0, sortOrder: 0 }],
          createdAt: "2026-03-24T10:00:00.000Z",
          updatedAt: "2026-03-24T10:00:00.000Z",
        },
      ],
      catalogProducts: [
        {
          productId: "550e8400-e29b-41d4-a716-446655440000",
          sku: "STEAK-MED",
          name: "Steak",
          barcode: null,
          priceCents: 2400,
          taxable: true,
          status: "ACTIVE",
          estimatedQty: 3,
        },
      ],
      floorPlanRooms: [],
    });

    expect(input.catalogProducts[0]?.priceCents).toBe(2400);
    expect(input.modifierGroups[0]?.isRequired).toBe(true);
  });

  it("parses shift close summary cards with anomalies", () => {
    const card = RestaurantShiftCloseSummaryCardSchema.parse({
      ok: true,
      cardType: "restaurant.shift-close-summary",
      summary: "Shift close needs review before confirmation.",
      metrics: {
        openTables: 1,
        sentOrders: 5,
        unpaidOrders: 2,
        pendingApprovals: 1,
        expectedCashCents: 25000,
        countedCashCents: 24500,
        varianceCents: -500,
      },
      anomalies: ["2 order(s) are not fully settled.", "Cash variance is under by 500 cents."],
      confidence: 0.97,
      rationale: "Summarized from shift-close inputs.",
      provenance: {
        extractedFields: ["expectedCashCents", "countedCashCents"],
      },
    });

    expect(card.metrics.varianceCents).toBe(-500);
    expect(card.anomalies).toHaveLength(2);
  });
});
