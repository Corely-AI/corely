import { describe, expect, it } from "vitest";
import { ConflictError, ValidationError } from "@corely/kernel";
import { RestaurantOrderAggregate } from "../domain/restaurant-order.aggregate";

function buildAggregate() {
  return new RestaurantOrderAggregate(
    {
      id: "session-1",
      tenantId: "tenant-1",
      workspaceId: "workspace-1",
      tableId: "table-1",
      registerId: "register-1",
      shiftSessionId: "shift-1",
      openedByUserId: "user-1",
      openedAt: "2026-03-24T10:00:00.000Z",
      closedAt: null,
      status: "OPEN",
      transferCount: 0,
      createdAt: "2026-03-24T10:00:00.000Z",
      updatedAt: "2026-03-24T10:00:00.000Z",
    },
    {
      id: "order-1",
      tenantId: "tenant-1",
      workspaceId: "workspace-1",
      tableSessionId: "session-1",
      tableId: "table-1",
      status: "DRAFT",
      subtotalCents: 1200,
      discountCents: 0,
      taxCents: 120,
      totalCents: 1320,
      sentAt: null,
      paidAt: null,
      closedAt: null,
      items: [
        {
          id: "item-1",
          orderId: "order-1",
          catalogItemId: "catalog-1",
          itemName: "Burger",
          sku: "BURGER",
          quantity: 1,
          sentQuantity: 0,
          unitPriceCents: 1200,
          taxRateBps: 1000,
          taxCents: 120,
          lineSubtotalCents: 1200,
          lineTotalCents: 1320,
          voidedAt: null,
          modifiers: [],
        },
      ],
      payments: [],
      createdAt: "2026-03-24T10:00:00.000Z",
      updatedAt: "2026-03-24T10:00:00.000Z",
    }
  );
}

describe("RestaurantOrderAggregate", () => {
  it("replaces draft items and recalculates totals", () => {
    const aggregate = buildAggregate();

    aggregate.replaceDraft(
      [
        {
          id: "item-1",
          catalogItemId: "catalog-1",
          itemName: "Burger",
          sku: "BURGER",
          quantity: 2,
          unitPriceCents: 1200,
          taxRateBps: 1000,
          modifiers: [
            {
              id: "modifier-1",
              optionName: "Cheese",
              modifierGroupId: "group-1",
              quantity: 1,
              priceDeltaCents: 200,
            },
          ],
        },
      ],
      100
    );

    expect(aggregate.order.subtotalCents).toBe(2600);
    expect(aggregate.order.taxCents).toBe(260);
    expect(aggregate.order.totalCents).toBe(2760);
    expect(aggregate.order.status).toBe("DRAFT");
  });

  it("does not allow sent items to be removed or changed", () => {
    const aggregate = buildAggregate();
    aggregate.order.items[0].sentQuantity = 1;
    aggregate.order.status = "SENT";

    expect(() =>
      aggregate.replaceDraft(
        [
          {
            id: "item-1",
            catalogItemId: "catalog-1",
            itemName: "Burger",
            sku: "BURGER",
            quantity: 2,
            unitPriceCents: 1200,
            taxRateBps: 1000,
            modifiers: [],
          },
        ],
        0
      )
    ).toThrow(ConflictError);
  });

  it("marks unsent items as sent", () => {
    const aggregate = buildAggregate();

    const sentItems = aggregate.sendPending("2026-03-24T10:05:00.000Z");

    expect(sentItems).toHaveLength(1);
    expect(aggregate.order.items[0].sentQuantity).toBe(1);
    expect(aggregate.order.status).toBe("SENT");
    expect(aggregate.order.sentAt).toBe("2026-03-24T10:05:00.000Z");
  });

  it("applies voids and discounts before close", () => {
    const aggregate = buildAggregate();

    aggregate.applyDiscount(200, "2026-03-24T10:06:00.000Z");
    aggregate.applyVoid("item-1", "2026-03-24T10:07:00.000Z");

    expect(aggregate.order.subtotalCents).toBe(0);
    expect(aggregate.order.taxCents).toBe(0);
    expect(aggregate.order.totalCents).toBe(0);
  });

  it("requires payments to exactly match the order total on close", () => {
    const aggregate = buildAggregate();
    aggregate.sendPending("2026-03-24T10:05:00.000Z");

    expect(() =>
      aggregate.close(
        [
          {
            paymentId: "payment-1",
            method: "CASH",
            amountCents: 1000,
            reference: null,
          },
        ],
        "2026-03-24T10:10:00.000Z"
      )
    ).toThrow(ValidationError);

    aggregate.close(
      [
        {
          paymentId: "payment-1",
          method: "CASH",
          amountCents: 1320,
          reference: null,
        },
      ],
      "2026-03-24T10:10:00.000Z"
    );

    expect(aggregate.order.status).toBe("CLOSED");
    expect(aggregate.session.status).toBe("CLOSED");
    expect(aggregate.order.payments).toHaveLength(1);
  });
});
