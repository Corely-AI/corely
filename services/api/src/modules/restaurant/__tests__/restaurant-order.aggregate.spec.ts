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

function buildAggregateForTable(
  suffix: string,
  input?: {
    tableId?: string;
    unitPriceCents?: number;
    taxRateBps?: number;
    discountCents?: number;
    sentQuantity?: number;
    sentAt?: string | null;
  }
) {
  const aggregate = new RestaurantOrderAggregate(
    {
      id: `session-${suffix}`,
      tenantId: "tenant-1",
      workspaceId: "workspace-1",
      tableId: input?.tableId ?? `table-${suffix}`,
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
      id: `order-${suffix}`,
      tenantId: "tenant-1",
      workspaceId: "workspace-1",
      tableSessionId: `session-${suffix}`,
      tableId: input?.tableId ?? `table-${suffix}`,
      status: (input?.sentQuantity ?? 0) > 0 ? "SENT" : "DRAFT",
      subtotalCents: input?.unitPriceCents ?? 1200,
      discountCents: input?.discountCents ?? 0,
      taxCents: Math.round(
        ((input?.unitPriceCents ?? 1200) * (input?.taxRateBps ?? 1000)) / 10_000
      ),
      totalCents:
        (input?.unitPriceCents ?? 1200) +
        Math.round(((input?.unitPriceCents ?? 1200) * (input?.taxRateBps ?? 1000)) / 10_000) -
        (input?.discountCents ?? 0),
      sentAt: input?.sentAt ?? null,
      paidAt: null,
      closedAt: null,
      items: [
        {
          id: `item-${suffix}`,
          orderId: `order-${suffix}`,
          catalogItemId: `catalog-${suffix}`,
          itemName: `Item ${suffix}`,
          sku: `SKU-${suffix}`,
          quantity: 1,
          sentQuantity: input?.sentQuantity ?? 0,
          unitPriceCents: input?.unitPriceCents ?? 1200,
          taxRateBps: input?.taxRateBps ?? 1000,
          taxCents: Math.round(
            ((input?.unitPriceCents ?? 1200) * (input?.taxRateBps ?? 1000)) / 10_000
          ),
          lineSubtotalCents: input?.unitPriceCents ?? 1200,
          lineTotalCents:
            (input?.unitPriceCents ?? 1200) +
            Math.round(((input?.unitPriceCents ?? 1200) * (input?.taxRateBps ?? 1000)) / 10_000),
          voidedAt: null,
          modifiers: [],
        },
      ],
      payments: [],
      createdAt: "2026-03-24T10:00:00.000Z",
      updatedAt: "2026-03-24T10:00:00.000Z",
    }
  );

  return aggregate;
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

  it("merges a source check into a target check and closes the source session", () => {
    const source = buildAggregateForTable("source", {
      tableId: "table-a",
      unitPriceCents: 900,
      taxRateBps: 1000,
      discountCents: 50,
      sentQuantity: 1,
      sentAt: "2026-03-24T10:04:00.000Z",
    });
    const target = buildAggregateForTable("target", {
      tableId: "table-b",
      unitPriceCents: 1200,
      taxRateBps: 700,
    });

    const { sourceItemIdMap } = RestaurantOrderAggregate.merge(
      source,
      target,
      "2026-03-24T10:08:00.000Z"
    );

    expect(source.session.status).toBe("TRANSFERRED");
    expect(source.session.closedAt).toBe("2026-03-24T10:08:00.000Z");
    expect(source.order.status).toBe("CANCELLED");
    expect(source.order.closedAt).toBe("2026-03-24T10:08:00.000Z");

    expect(target.order.id).toBe("order-target");
    expect(target.order.items).toHaveLength(2);
    expect(target.order.discountCents).toBe(50);
    expect(target.order.sentAt).toBe("2026-03-24T10:04:00.000Z");
    expect(target.order.status).toBe("PARTIALLY_SENT");
    expect(target.order.subtotalCents).toBe(2100);
    expect(target.order.taxCents).toBe(174);
    expect(target.order.totalCents).toBe(2224);

    const clonedSourceItem = target.order.items.find(
      (item) => item.catalogItemId === "catalog-source"
    );
    expect(clonedSourceItem?.orderId).toBe("order-target");
    expect(clonedSourceItem?.id).not.toBe("item-source");
    expect(sourceItemIdMap.get("item-source")).toBe(clonedSourceItem?.id);
  });

  it("rejects merging the same check or a paid check", () => {
    const same = buildAggregateForTable("same");
    expect(() => RestaurantOrderAggregate.merge(same, same, "2026-03-24T10:08:00.000Z")).toThrow(
      ConflictError
    );

    const source = buildAggregateForTable("source");
    const target = buildAggregateForTable("target");
    source.order.payments = [
      { id: "payment-1", method: "CARD", amountCents: source.order.totalCents, reference: null },
    ];

    expect(() =>
      RestaurantOrderAggregate.merge(source, target, "2026-03-24T10:08:00.000Z")
    ).toThrow(ConflictError);
  });
});
