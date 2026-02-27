import { v4 as uuidv4 } from "@lukeed/uuid";
import { SaleBuilder } from "@corely/pos-core";
import type { OutboxCommand } from "@corely/offline-core";
import type {
  PosSale,
  PosSaleLineItem,
  ProductSnapshot,
  ShiftSession,
  SyncPosSaleInput,
} from "@corely/contracts";
import {
  buildDeterministicIdempotencyKey,
  createPosOutboxCommand,
  PosCommandTypes,
  type ShiftCashEventCommandPayload,
  type ShiftCashEventType,
} from "@/offline/posOutbox";
import type {
  CreateSaleAndEnqueueInput,
  SaleCreateResult,
  ShiftCashEventInput,
  ShiftCloseInput,
  ShiftOpenInput,
} from "@/services/posLocalService";

const saleBuilder = new SaleBuilder();

type ShiftCashEventRow = {
  eventId: string;
  sessionId: string;
  eventType: ShiftCashEventType;
  amountCents: number;
  reason: string | null;
  occurredAt: Date;
  syncStatus: "PENDING" | "SYNCED" | "FAILED";
  lastError: string | null;
};

export class PosLocalServiceWeb {
  private products: ProductSnapshot[] = [];
  private lastCatalogSyncAt: Date | null = null;
  private sales = new Map<string, PosSale>();
  private openShiftsByRegister = new Map<string, ShiftSession>();
  private shiftsById = new Map<string, ShiftSession>();
  private shiftCashEvents = new Map<string, ShiftCashEventRow[]>();

  async replaceCatalogSnapshot(
    products: ProductSnapshot[],
    options?: {
      resetBeforeUpsert?: boolean;
    }
  ): Promise<void> {
    if (options?.resetBeforeUpsert) {
      this.products = [...products];
      return;
    }

    const byId = new Map(this.products.map((product) => [product.productId, product]));
    for (const product of products) {
      byId.set(product.productId, product);
    }
    this.products = Array.from(byId.values());
  }

  async searchCatalog(query: string): Promise<ProductSnapshot[]> {
    const normalized = query.trim().toLowerCase();
    if (!normalized) {
      return this.listCatalog(300);
    }

    return this.products
      .filter((product) => {
        return (
          product.name.toLowerCase().includes(normalized) ||
          product.sku.toLowerCase().includes(normalized) ||
          (product.barcode ?? "").toLowerCase().includes(normalized)
        );
      })
      .slice(0, 120);
  }

  async listCatalog(limit = 200): Promise<ProductSnapshot[]> {
    return this.products
      .slice()
      .sort((a, b) => a.name.localeCompare(b.name))
      .slice(0, limit);
  }

  async getProductByBarcode(barcode: string): Promise<ProductSnapshot | null> {
    return this.products.find((product) => product.barcode === barcode) ?? null;
  }

  async createSaleAndEnqueue(input: CreateSaleAndEnqueueInput): Promise<SaleCreateResult> {
    if (!input.lineItems.length) {
      throw new Error("Cannot finalize sale with empty cart");
    }

    const posSaleId = uuidv4();
    const saleDate = new Date();
    const idempotencyKey = buildDeterministicIdempotencyKey.saleFinalize(posSaleId);

    const lineItems: PosSaleLineItem[] = input.lineItems.map((line) => {
      const lineTotalCents = saleBuilder.calculateLineTotal(
        line.quantity,
        line.unitPriceCents,
        line.discountCents
      );
      return {
        lineItemId: line.lineItemId,
        productId: line.productId,
        productName: line.productName,
        sku: line.sku,
        quantity: line.quantity,
        unitPriceCents: line.unitPriceCents,
        discountCents: line.discountCents,
        lineTotalCents,
      };
    });

    const subtotalCents = saleBuilder.calculateSubtotal(lineItems);
    const totalCents = saleBuilder.calculateTotal(
      subtotalCents,
      input.cartDiscountCents,
      input.taxCents
    );
    const paymentsTotal = input.payments.reduce((sum, payment) => sum + payment.amountCents, 0);
    if (paymentsTotal < totalCents) {
      throw new Error("Collected payments are less than sale total");
    }

    const syncPayload: SyncPosSaleInput = {
      posSaleId,
      workspaceId: input.workspaceId,
      sessionId: input.sessionId,
      registerId: input.registerId,
      saleDate,
      cashierEmployeePartyId: input.cashierEmployeePartyId,
      customerPartyId: input.customerPartyId,
      lineItems,
      cartDiscountCents: input.cartDiscountCents,
      subtotalCents,
      taxCents: input.taxCents,
      totalCents,
      payments: input.payments,
      idempotencyKey,
    };

    const command = createPosOutboxCommand(
      input.workspaceId,
      PosCommandTypes.SaleFinalize,
      syncPayload,
      idempotencyKey
    ) as OutboxCommand<SyncPosSaleInput>;

    const sale: PosSale = {
      posSaleId,
      workspaceId: input.workspaceId,
      sessionId: input.sessionId,
      registerId: input.registerId,
      saleDate,
      cashierEmployeePartyId: input.cashierEmployeePartyId,
      customerPartyId: input.customerPartyId,
      receiptNumber: this.generateReceiptNumber(input.registerId, saleDate, posSaleId),
      cartDiscountCents: input.cartDiscountCents,
      subtotalCents,
      taxCents: input.taxCents,
      totalCents,
      lineItems,
      payments: input.payments,
      status: "PENDING_SYNC",
      idempotencyKey,
      serverInvoiceId: null,
      serverPaymentId: null,
      syncError: null,
      syncAttempts: 0,
      syncedAt: null,
      localCreatedAt: saleDate,
    };

    this.sales.set(posSaleId, sale);

    if (input.sessionId) {
      const shift = this.shiftsById.get(input.sessionId);
      if (shift) {
        const cashCollectedCents = input.payments
          .filter((payment) => payment.method === "CASH")
          .reduce((sum, payment) => sum + payment.amountCents, 0);

        const updatedShift: ShiftSession = {
          ...shift,
          totalSalesCents: shift.totalSalesCents + totalCents,
          totalCashReceivedCents: shift.totalCashReceivedCents + cashCollectedCents,
          updatedAt: new Date(),
        };
        this.shiftsById.set(updatedShift.sessionId, updatedShift);
        if (updatedShift.status === "OPEN") {
          this.openShiftsByRegister.set(updatedShift.registerId, updatedShift);
        }
      }
    }

    return { sale, command };
  }

  async getSaleById(posSaleId: string): Promise<PosSale | null> {
    return this.sales.get(posSaleId) ?? null;
  }

  async markSaleSynced(
    posSaleId: string,
    output: {
      serverInvoiceId?: string;
      serverPaymentId?: string;
    }
  ): Promise<void> {
    const current = this.sales.get(posSaleId);
    if (!current) {
      return;
    }

    this.sales.set(posSaleId, {
      ...current,
      status: "SYNCED",
      serverInvoiceId: output.serverInvoiceId ?? null,
      serverPaymentId: output.serverPaymentId ?? null,
      syncError: null,
      syncAttempts: current.syncAttempts + 1,
      syncedAt: new Date(),
    });
  }

  async markSaleSyncFailure(posSaleId: string, reason: string): Promise<void> {
    const current = this.sales.get(posSaleId);
    if (!current) {
      return;
    }

    this.sales.set(posSaleId, {
      ...current,
      status: "FAILED",
      syncError: reason,
      syncAttempts: current.syncAttempts + 1,
    });
  }

  async getCurrentOpenShift(registerId: string): Promise<ShiftSession | null> {
    return this.openShiftsByRegister.get(registerId) ?? null;
  }

  async upsertShiftSession(session: ShiftSession): Promise<void> {
    this.shiftsById.set(session.sessionId, session);
    if (session.status === "OPEN") {
      this.openShiftsByRegister.set(session.registerId, session);
      return;
    }
    this.openShiftsByRegister.delete(session.registerId);
  }

  async openShiftAndEnqueue(input: ShiftOpenInput): Promise<ShiftSession> {
    const now = new Date();
    const sessionId = uuidv4();

    const session: ShiftSession = {
      sessionId,
      registerId: input.registerId,
      workspaceId: input.workspaceId,
      openedByEmployeePartyId: input.openedByEmployeePartyId,
      openedAt: now,
      startingCashCents: input.startingCashCents,
      status: "OPEN",
      closedAt: null,
      closedByEmployeePartyId: null,
      closingCashCents: null,
      totalSalesCents: 0,
      totalCashReceivedCents: 0,
      varianceCents: null,
      notes: input.notes ?? null,
      createdAt: now,
      updatedAt: now,
    };

    this.shiftsById.set(sessionId, session);
    this.openShiftsByRegister.set(input.registerId, session);

    return session;
  }

  async closeShiftAndEnqueue(input: ShiftCloseInput): Promise<ShiftSession> {
    const session = this.shiftsById.get(input.sessionId);
    if (!session) {
      throw new Error("Shift session not found");
    }
    if (session.status !== "OPEN") {
      throw new Error("Shift session is already closed");
    }

    const events = this.shiftCashEvents.get(input.sessionId) ?? [];
    const paidIn = events
      .filter((event) => event.eventType === "PAID_IN")
      .reduce((sum, event) => sum + event.amountCents, 0);
    const paidOut = events
      .filter((event) => event.eventType === "PAID_OUT")
      .reduce((sum, event) => sum + event.amountCents, 0);

    const expectedCashCents =
      (session.startingCashCents ?? 0) + session.totalCashReceivedCents + paidIn - paidOut;
    const varianceCents =
      input.closingCashCents === null ? null : input.closingCashCents - expectedCashCents;

    const closed: ShiftSession = {
      ...session,
      status: "CLOSED",
      closedAt: new Date(),
      closedByEmployeePartyId: input.closedByEmployeePartyId,
      closingCashCents: input.closingCashCents,
      varianceCents,
      notes: input.notes ?? session.notes,
      updatedAt: new Date(),
    };

    this.shiftsById.set(closed.sessionId, closed);
    this.openShiftsByRegister.delete(closed.registerId);

    return closed;
  }

  async createShiftCashEventAndEnqueue(input: ShiftCashEventInput): Promise<void> {
    if (input.amountCents <= 0) {
      throw new Error("Cash event amount must be positive");
    }

    const occurredAt = new Date();
    const eventId = uuidv4();

    const payload: ShiftCashEventCommandPayload = {
      eventId,
      sessionId: input.sessionId,
      registerId: input.registerId,
      eventType: input.eventType,
      amountCents: input.amountCents,
      reason: input.reason,
      occurredAt: occurredAt.toISOString(),
    };

    // Keep deterministic key generation parity with native service.
    void createPosOutboxCommand(
      input.workspaceId,
      PosCommandTypes.ShiftCashEvent,
      payload,
      buildDeterministicIdempotencyKey.shiftCashEvent(eventId)
    );

    const events = this.shiftCashEvents.get(input.sessionId) ?? [];
    events.unshift({
      eventId,
      sessionId: input.sessionId,
      eventType: input.eventType,
      amountCents: input.amountCents,
      reason: input.reason,
      occurredAt,
      syncStatus: "PENDING",
      lastError: null,
    });
    this.shiftCashEvents.set(input.sessionId, events);
  }

  async markShiftCashEventSynced(eventId: string): Promise<void> {
    for (const [sessionId, events] of this.shiftCashEvents.entries()) {
      const nextEvents = events.map((event) =>
        event.eventId === eventId
          ? {
              ...event,
              syncStatus: "SYNCED" as const,
              lastError: null,
            }
          : event
      );
      this.shiftCashEvents.set(sessionId, nextEvents);
    }
  }

  async markShiftCashEventFailed(eventId: string, error: string): Promise<void> {
    for (const [sessionId, events] of this.shiftCashEvents.entries()) {
      const nextEvents = events.map((event) =>
        event.eventId === eventId
          ? {
              ...event,
              syncStatus: "FAILED" as const,
              lastError: error,
            }
          : event
      );
      this.shiftCashEvents.set(sessionId, nextEvents);
    }
  }

  async listShiftCashEvents(sessionId: string): Promise<
    Array<{
      eventId: string;
      eventType: ShiftCashEventType;
      amountCents: number;
      reason: string | null;
      occurredAt: Date;
      syncStatus: "PENDING" | "SYNCED" | "FAILED";
      lastError: string | null;
    }>
  > {
    const events = this.shiftCashEvents.get(sessionId) ?? [];
    return events.map((event) => ({ ...event }));
  }

  async updateLastCatalogSync(at: Date): Promise<void> {
    this.lastCatalogSyncAt = at;
  }

  async getLastCatalogSyncAt(): Promise<Date | null> {
    return this.lastCatalogSyncAt;
  }

  private generateReceiptNumber(registerId: string, date: Date, posSaleId: string): string {
    const datePart = `${date.getUTCFullYear()}${String(date.getUTCMonth() + 1).padStart(2, "0")}${String(
      date.getUTCDate()
    ).padStart(2, "0")}`;
    return `${registerId.slice(0, 6).toUpperCase()}-${datePart}-${posSaleId.slice(0, 6).toUpperCase()}`;
  }
}

let webPosLocalServiceSingleton: PosLocalServiceWeb | null = null;

export function getWebPosLocalService(): PosLocalServiceWeb {
  if (!webPosLocalServiceSingleton) {
    webPosLocalServiceSingleton = new PosLocalServiceWeb();
  }
  return webPosLocalServiceSingleton;
}
