import { ConflictError, ValidationError } from "@corely/kernel";
import type {
  DraftRestaurantOrderItemInput,
  RestaurantOrder,
  RestaurantOrderItem,
  RestaurantPaymentInput,
  TableSession,
} from "@corely/contracts";

export class RestaurantOrderAggregate {
  constructor(
    public readonly session: TableSession,
    public readonly order: RestaurantOrder
  ) {}

  replaceDraft(items: DraftRestaurantOrderItemInput[], discountCents: number): void {
    if (this.order.status === "CLOSED" || this.order.status === "CANCELLED") {
      throw new ConflictError("RESTAURANT_ORDER_LOCKED", "Closed orders cannot be edited");
    }

    const existingById = new Map(this.order.items.map((item) => [item.id, item]));
    const nextItems: RestaurantOrderItem[] = [];

    for (const existing of this.order.items) {
      if (existing.sentQuantity > 0 || existing.voidedAt) {
        const incoming = items.find((item) => item.id === existing.id);
        if (!incoming) {
          throw new ConflictError(
            "RESTAURANT_SENT_ITEM_IMMUTABLE",
            "Sent or voided items must remain unchanged in draft updates"
          );
        }
        this.assertLockedItemUnchanged(existing, incoming);
      }
    }

    for (const input of items) {
      const existing = input.id ? existingById.get(input.id) : undefined;
      if (existing?.sentQuantity && existing.sentQuantity > 0) {
        nextItems.push(existing);
        continue;
      }

      const normalized = toOrderItem(input, existing);
      nextItems.push(normalized);
    }

    this.order.items = nextItems;
    this.order.discountCents = Math.max(0, discountCents);
    this.refresh();
  }

  transfer(toTableId: string): void {
    if (this.session.status !== "OPEN") {
      throw new ConflictError("RESTAURANT_SESSION_NOT_OPEN", "Only open sessions can be moved");
    }
    this.session.tableId = toTableId;
    this.session.transferCount += 1;
    this.session.updatedAt = new Date().toISOString();
    this.order.tableId = toTableId;
    this.order.updatedAt = new Date().toISOString();
  }

  sendPending(nowIso: string): RestaurantOrderItem[] {
    const pending = this.order.items.filter((item) => item.sentQuantity === 0 && !item.voidedAt);
    if (pending.length === 0) {
      throw new ConflictError("RESTAURANT_NOTHING_TO_SEND", "No draft items are waiting for send");
    }
    for (const item of pending) {
      item.sentQuantity = item.quantity;
    }
    this.order.sentAt = nowIso;
    this.order.updatedAt = nowIso;
    this.refresh();
    return pending;
  }

  applyVoid(orderItemId: string, nowIso: string): void {
    const item = this.order.items.find((candidate) => candidate.id === orderItemId);
    if (!item) {
      throw new ConflictError("RESTAURANT_ORDER_ITEM_NOT_FOUND", "Order item not found");
    }
    if (item.voidedAt) {
      throw new ConflictError("RESTAURANT_ORDER_ITEM_ALREADY_VOIDED", "Item is already voided");
    }
    item.voidedAt = nowIso;
    this.order.updatedAt = nowIso;
    this.refresh();
  }

  applyDiscount(amountCents: number, nowIso: string): void {
    if (amountCents < 0) {
      throw new ValidationError("Discount must be non-negative");
    }
    this.order.discountCents = amountCents;
    this.order.updatedAt = nowIso;
    this.refresh();
  }

  close(payments: RestaurantPaymentInput[], nowIso: string): void {
    if (this.order.status === "CLOSED") {
      throw new ConflictError("RESTAURANT_ORDER_ALREADY_CLOSED", "Order is already closed");
    }

    const openDraftItems = this.order.items.filter(
      (item) => item.sentQuantity === 0 && !item.voidedAt
    );
    if (openDraftItems.length > 0) {
      throw new ConflictError(
        "RESTAURANT_ORDER_HAS_UNSENT_ITEMS",
        "All non-voided items must be sent before closing the table"
      );
    }

    const totalPaid = payments.reduce((sum, payment) => sum + payment.amountCents, 0);
    if (totalPaid !== this.order.totalCents) {
      throw new ValidationError("Payments must exactly match the order total");
    }

    this.order.payments = payments.map((payment) => ({
      id: payment.paymentId,
      method: payment.method,
      amountCents: payment.amountCents,
      reference: payment.reference ?? null,
    }));
    this.order.status = "CLOSED";
    this.order.paidAt = nowIso;
    this.order.closedAt = nowIso;
    this.order.updatedAt = nowIso;
    this.session.status = "CLOSED";
    this.session.closedAt = nowIso;
    this.session.updatedAt = nowIso;
  }

  private assertLockedItemUnchanged(
    existing: RestaurantOrderItem,
    incoming: DraftRestaurantOrderItemInput
  ): void {
    const incomingModifiers = incoming.modifiers.map((modifier) => ({
      modifierGroupId: modifier.modifierGroupId ?? null,
      optionName: modifier.optionName,
      quantity: modifier.quantity,
      priceDeltaCents: modifier.priceDeltaCents,
    }));
    const existingModifiers = existing.modifiers.map((modifier) => ({
      modifierGroupId: modifier.modifierGroupId,
      optionName: modifier.optionName,
      quantity: modifier.quantity,
      priceDeltaCents: modifier.priceDeltaCents,
    }));

    const unchanged =
      existing.catalogItemId === incoming.catalogItemId &&
      existing.itemName === incoming.itemName &&
      existing.sku === incoming.sku &&
      existing.quantity === incoming.quantity &&
      existing.unitPriceCents === incoming.unitPriceCents &&
      existing.taxRateBps === incoming.taxRateBps &&
      JSON.stringify(existingModifiers) === JSON.stringify(incomingModifiers);

    if (!unchanged) {
      throw new ConflictError(
        "RESTAURANT_SENT_ITEM_IMMUTABLE",
        "Sent or voided items cannot be modified"
      );
    }
  }

  private refresh(): void {
    let subtotal = 0;
    let tax = 0;
    for (const item of this.order.items) {
      if (item.voidedAt) {
        continue;
      }
      subtotal += item.lineSubtotalCents;
      tax += item.taxCents;
    }
    this.order.subtotalCents = subtotal;
    this.order.taxCents = tax;
    this.order.totalCents = Math.max(0, subtotal + tax - this.order.discountCents);

    const activeItems = this.order.items.filter((item) => !item.voidedAt);
    const hasSent = activeItems.some((item) => item.sentQuantity > 0);
    const hasDraft = activeItems.some((item) => item.sentQuantity === 0);

    if (this.order.status === "CLOSED") {
      return;
    }
    if (hasSent && hasDraft) {
      this.order.status = "PARTIALLY_SENT";
    } else if (hasSent) {
      this.order.status = "SENT";
    } else {
      this.order.status = "DRAFT";
    }
  }
}

function toOrderItem(
  input: DraftRestaurantOrderItemInput,
  existing?: RestaurantOrderItem
): RestaurantOrderItem {
  const modifiers = input.modifiers.map((modifier) => ({
    id: modifier.id ?? cryptoRandomId(),
    modifierGroupId: modifier.modifierGroupId ?? null,
    optionName: modifier.optionName,
    quantity: modifier.quantity,
    priceDeltaCents: modifier.priceDeltaCents,
  }));
  const modifiersSubtotal = modifiers.reduce(
    (sum, modifier) => sum + modifier.priceDeltaCents * modifier.quantity,
    0
  );
  const baseSubtotal = input.unitPriceCents * input.quantity;
  const lineSubtotal = baseSubtotal + modifiersSubtotal;
  const taxCents = Math.round((lineSubtotal * input.taxRateBps) / 10_000);

  return {
    id: input.id ?? cryptoRandomId(),
    orderId: existing?.orderId ?? "",
    catalogItemId: input.catalogItemId,
    itemName: input.itemName,
    sku: input.sku,
    quantity: input.quantity,
    sentQuantity: existing?.sentQuantity ?? 0,
    unitPriceCents: input.unitPriceCents,
    taxRateBps: input.taxRateBps,
    taxCents,
    lineSubtotalCents: lineSubtotal,
    lineTotalCents: lineSubtotal + taxCents,
    voidedAt: existing?.voidedAt ?? null,
    modifiers,
  };
}

function cryptoRandomId(): string {
  return `rst_${Math.random().toString(36).slice(2, 10)}${Date.now().toString(36)}`;
}
