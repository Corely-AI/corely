import type { PosSale, ProductSnapshot, ShiftSession } from "@corely/contracts";
import type {
  CatalogProductRow,
  PosSaleLineRow,
  PosSalePaymentRow,
  PosSaleRow,
  ShiftCashEventRecord,
  ShiftCashEventRow,
  ShiftSessionRow,
} from "@/services/posLocalService.types";

export function toCatalogProduct(row: CatalogProductRow): ProductSnapshot {
  return {
    productId: row.product_id,
    sku: row.sku,
    name: row.name,
    barcode: row.barcode,
    priceCents: row.price_cents,
    taxable: Boolean(row.taxable),
    status: row.status,
    estimatedQty: row.estimated_qty,
  };
}

export function mapShift(row: ShiftSessionRow): ShiftSession {
  return {
    sessionId: row.session_id,
    registerId: row.register_id,
    workspaceId: row.workspace_id,
    openedByEmployeePartyId: row.opened_by_employee_party_id,
    openedAt: new Date(row.opened_at),
    startingCashCents: row.starting_cash_cents,
    status: row.status,
    closedAt: row.closed_at ? new Date(row.closed_at) : null,
    closedByEmployeePartyId: row.closed_by_employee_party_id,
    closingCashCents: row.closing_cash_cents,
    totalSalesCents: row.total_sales_cents,
    totalCashReceivedCents: row.total_cash_received_cents,
    varianceCents: row.variance_cents,
    notes: row.notes,
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at),
  };
}

export function mapSale(
  row: PosSaleRow,
  lineRows: PosSaleLineRow[],
  paymentRows: PosSalePaymentRow[]
): PosSale {
  return {
    posSaleId: row.pos_sale_id,
    workspaceId: row.workspace_id,
    sessionId: row.session_id,
    registerId: row.register_id,
    saleDate: new Date(row.sale_date),
    cashierEmployeePartyId: row.cashier_employee_party_id,
    customerPartyId: row.customer_party_id,
    receiptNumber: row.receipt_number,
    cartDiscountCents: row.cart_discount_cents,
    subtotalCents: row.subtotal_cents,
    taxCents: row.tax_cents,
    totalCents: row.total_cents,
    lineItems: lineRows.map((line) => ({
      lineItemId: line.line_item_id,
      productId: line.product_id,
      productName: line.product_name,
      sku: line.sku,
      quantity: line.quantity,
      unitPriceCents: line.unit_price_cents,
      discountCents: line.discount_cents,
      lineTotalCents: line.line_total_cents,
    })),
    payments: paymentRows.map((payment) => ({
      paymentId: payment.payment_id,
      method: payment.method,
      amountCents: payment.amount_cents,
      reference: payment.reference,
    })),
    status: row.status,
    idempotencyKey: row.idempotency_key,
    serverInvoiceId: row.server_invoice_id,
    serverPaymentId: row.server_payment_id,
    syncError: row.sync_error,
    syncAttempts: row.sync_attempts,
    syncedAt: row.synced_at ? new Date(row.synced_at) : null,
    localCreatedAt: new Date(row.local_created_at),
  };
}

export function mapShiftCashEvent(row: ShiftCashEventRow): ShiftCashEventRecord {
  return {
    eventId: row.event_id,
    eventType: row.event_type,
    amountCents: row.amount_cents,
    reason: row.reason,
    occurredAt: new Date(row.occurred_at),
    syncStatus: row.sync_status,
    lastError: row.last_error,
  };
}

export function generateReceiptNumber(registerId: string, saleDate: Date, saleId: string): string {
  const day = saleDate.toISOString().slice(0, 10).replace(/-/g, "");
  return `${registerId.slice(0, 6).toUpperCase()}-${day}-${saleId.slice(0, 6).toUpperCase()}`;
}
