import type { PosSale, PosSalePayment, SyncPosSaleInput } from "@corely/contracts";
import type { OutboxCommand } from "@corely/offline-core";
import type { ShiftCashEventType } from "@/offline/posOutbox";

export type CartLineInput = {
  lineItemId: string;
  productId: string;
  productName: string;
  sku: string;
  quantity: number;
  unitPriceCents: number;
  discountCents: number;
};

export interface CreateSaleAndEnqueueInput {
  workspaceId: string;
  registerId: string;
  sessionId: string | null;
  cashierEmployeePartyId: string;
  customerPartyId: string | null;
  cartDiscountCents: number;
  taxCents: number;
  notes: string | null;
  lineItems: CartLineInput[];
  payments: PosSalePayment[];
  hardwareArtifact?: unknown;
}

export interface SaleCreateResult {
  sale: PosSale;
  command: OutboxCommand<SyncPosSaleInput>;
}

export interface ShiftOpenInput {
  workspaceId: string;
  registerId: string;
  openedByEmployeePartyId: string;
  startingCashCents: number | null;
  notes?: string;
}

export interface ShiftCloseInput {
  sessionId: string;
  workspaceId: string;
  closedByEmployeePartyId: string;
  closingCashCents: number | null;
  notes?: string;
}

export interface ShiftCashEventInput {
  sessionId: string;
  workspaceId: string;
  registerId: string;
  createdByEmployeePartyId: string;
  eventType: ShiftCashEventType;
  amountCents: number;
  reason: string | null;
}

export interface ShiftCashEventRecord {
  eventId: string;
  eventType: ShiftCashEventType;
  amountCents: number;
  reason: string | null;
  occurredAt: Date;
  syncStatus: "PENDING" | "SYNCED" | "FAILED";
  lastError: string | null;
}

export interface ShiftCashEventTotals {
  paidInCents: number;
  paidOutCents: number;
}

export interface CatalogProductRow {
  product_id: string;
  sku: string;
  name: string;
  barcode: string | null;
  price_cents: number;
  taxable: number;
  status: "ACTIVE" | "INACTIVE" | "ARCHIVED";
  estimated_qty: number | null;
}

export interface PosSaleRow {
  pos_sale_id: string;
  workspace_id: string;
  session_id: string | null;
  register_id: string;
  sale_date: string;
  cashier_employee_party_id: string;
  customer_party_id: string | null;
  receipt_number: string;
  cart_discount_cents: number;
  subtotal_cents: number;
  tax_cents: number;
  total_cents: number;
  status: "PENDING_SYNC" | "SYNCED" | "FAILED";
  idempotency_key: string;
  server_invoice_id: string | null;
  server_payment_id: string | null;
  sync_error: string | null;
  sync_attempts: number;
  local_created_at: string;
  synced_at: string | null;
}

export interface PosSaleLineRow {
  line_item_id: string;
  product_id: string;
  product_name: string;
  sku: string;
  quantity: number;
  unit_price_cents: number;
  discount_cents: number;
  line_total_cents: number;
}

export interface PosSalePaymentRow {
  payment_id: string;
  method: PosSalePayment["method"];
  amount_cents: number;
  reference: string | null;
}

export interface ShiftSessionRow {
  session_id: string;
  register_id: string;
  workspace_id: string;
  opened_by_employee_party_id: string;
  opened_at: string;
  starting_cash_cents: number | null;
  status: "OPEN" | "CLOSED";
  closed_at: string | null;
  closed_by_employee_party_id: string | null;
  closing_cash_cents: number | null;
  total_sales_cents: number;
  total_cash_received_cents: number;
  variance_cents: number | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface ShiftSessionCloseInputRow {
  session_id: string;
  register_id: string;
  workspace_id: string;
  opened_by_employee_party_id: string;
  opened_at: string;
  starting_cash_cents: number | null;
  status: "OPEN" | "CLOSED";
  total_sales_cents: number;
  total_cash_received_cents: number;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface ShiftCashEventRow {
  event_id: string;
  event_type: ShiftCashEventType;
  amount_cents: number;
  reason: string | null;
  occurred_at: string;
  sync_status: "PENDING" | "SYNCED" | "FAILED";
  last_error: string | null;
}
