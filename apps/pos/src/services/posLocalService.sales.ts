import { v4 as uuidv4 } from "@lukeed/uuid";
import type * as SQLite from "expo-sqlite";
import type { PosSale, PosSaleLineItem, PosSalePayment, SyncPosSaleInput } from "@corely/contracts";
import { SaleBuilder } from "@corely/pos-core";
import {
  buildDeterministicIdempotencyKey,
  createPosOutboxCommand,
  PosCommandTypes,
} from "@/offline/posOutbox";
import { insertOutboxCommandTransactional, runInTransaction } from "@/lib/pos-db";
import { generateReceiptNumber, mapSale } from "@/services/posLocalService.mappers";
import type {
  CreateSaleAndEnqueueInput,
  PosSaleLineRow,
  PosSalePaymentRow,
  PosSaleRow,
  SaleCreateResult,
} from "@/services/posLocalService.types";

const saleBuilder = new SaleBuilder();

export async function createSaleAndEnqueue(
  db: SQLite.SQLiteDatabase,
  input: CreateSaleAndEnqueueInput
): Promise<SaleCreateResult> {
  if (!input.lineItems.length) {
    throw new Error("Cannot finalize sale with empty cart");
  }

  const posSaleId = uuidv4();
  const saleDate = new Date();
  const receiptNumber = generateReceiptNumber(input.registerId, saleDate, posSaleId);
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
  );

  await runInTransaction(db, async () => {
    await db.runAsync(
      `INSERT INTO pos_sales (
        pos_sale_id,
        workspace_id,
        session_id,
        register_id,
        sale_date,
        cashier_employee_party_id,
        customer_party_id,
        receipt_number,
        cart_discount_cents,
        subtotal_cents,
        tax_cents,
        total_cents,
        status,
        idempotency_key,
        notes,
        hardware_artifact_json,
        local_created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        posSaleId,
        input.workspaceId,
        input.sessionId,
        input.registerId,
        saleDate.toISOString(),
        input.cashierEmployeePartyId,
        input.customerPartyId,
        receiptNumber,
        input.cartDiscountCents,
        subtotalCents,
        input.taxCents,
        totalCents,
        "PENDING_SYNC",
        idempotencyKey,
        input.notes,
        input.hardwareArtifact ? JSON.stringify(input.hardwareArtifact) : null,
        saleDate.toISOString(),
      ]
    );

    for (const line of lineItems) {
      await db.runAsync(
        `INSERT INTO pos_sale_line_items (
          line_item_id,
          pos_sale_id,
          product_id,
          product_name,
          sku,
          quantity,
          unit_price_cents,
          discount_cents,
          line_total_cents
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          line.lineItemId,
          posSaleId,
          line.productId,
          line.productName,
          line.sku,
          line.quantity,
          line.unitPriceCents,
          line.discountCents,
          line.lineTotalCents,
        ]
      );
    }

    for (const payment of input.payments) {
      await db.runAsync(
        `INSERT INTO pos_sale_payments (
          payment_id,
          pos_sale_id,
          method,
          amount_cents,
          reference
        ) VALUES (?, ?, ?, ?, ?)`,
        [payment.paymentId, posSaleId, payment.method, payment.amountCents, payment.reference]
      );
    }

    if (input.sessionId) {
      const cashCollectedCents = input.payments
        .filter((payment) => payment.method === "CASH")
        .reduce((sum, payment) => sum + payment.amountCents, 0);

      await db.runAsync(
        `UPDATE shift_sessions_local
         SET total_sales_cents = total_sales_cents + ?,
             total_cash_received_cents = total_cash_received_cents + ?,
             updated_at = ?
         WHERE session_id = ?`,
        [totalCents, cashCollectedCents, new Date().toISOString(), input.sessionId]
      );
    }

    await insertOutboxCommandTransactional(db, command);
  });

  const sale = await getSaleById(db, posSaleId);
  if (!sale) {
    throw new Error("Sale was written locally but could not be reloaded");
  }

  return { sale, command };
}

export async function getSaleById(
  db: SQLite.SQLiteDatabase,
  posSaleId: string
): Promise<PosSale | null> {
  const row = await db.getFirstAsync<PosSaleRow>(`SELECT * FROM pos_sales WHERE pos_sale_id = ?`, [
    posSaleId,
  ]);

  if (!row) {
    return null;
  }

  const lineRows = await db.getAllAsync<PosSaleLineRow>(
    `SELECT * FROM pos_sale_line_items WHERE pos_sale_id = ? ORDER BY rowid ASC`,
    [posSaleId]
  );

  const paymentRows = await db.getAllAsync<PosSalePaymentRow>(
    `SELECT * FROM pos_sale_payments WHERE pos_sale_id = ? ORDER BY rowid ASC`,
    [posSaleId]
  );

  return mapSale(row, lineRows, paymentRows);
}

export async function markSaleSynced(
  db: SQLite.SQLiteDatabase,
  posSaleId: string,
  output: { serverInvoiceId?: string; serverPaymentId?: string }
): Promise<void> {
  await db.runAsync(
    `UPDATE pos_sales
     SET status = 'SYNCED',
         server_invoice_id = ?,
         server_payment_id = ?,
         sync_error = NULL,
         synced_at = ?,
         sync_attempts = sync_attempts + 1
     WHERE pos_sale_id = ?`,
    [
      output.serverInvoiceId ?? null,
      output.serverPaymentId ?? null,
      new Date().toISOString(),
      posSaleId,
    ]
  );
}

export async function markSaleSyncFailure(
  db: SQLite.SQLiteDatabase,
  posSaleId: string,
  reason: string
): Promise<void> {
  await db.runAsync(
    `UPDATE pos_sales
     SET status = 'FAILED',
         sync_error = ?,
         sync_attempts = sync_attempts + 1
     WHERE pos_sale_id = ?`,
    [reason, posSaleId]
  );
}

export function getCashPaymentsTotal(payments: PosSalePayment[]): number {
  return payments
    .filter((payment) => payment.method === "CASH")
    .reduce((sum, payment) => sum + payment.amountCents, 0);
}
