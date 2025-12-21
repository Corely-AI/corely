import { InvoiceLine, InvoicePayment, InvoiceStatus, InvoiceTotals } from "./invoice.types";

type InvoiceProps = {
  id: string;
  tenantId: string;
  customerId: string;
  currency: string;
  notes?: string | null;
  terms?: string | null;
  number?: string | null;
  status: InvoiceStatus;
  lineItems: InvoiceLine[];
  payments: InvoicePayment[];
  issuedAt?: Date | null;
  sentAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
};

export class InvoiceAggregate {
  id: string;
  tenantId: string;
  customerId: string;
  currency: string;
  notes?: string | null;
  terms?: string | null;
  number: string | null;
  status: InvoiceStatus;
  lineItems: InvoiceLine[];
  payments: InvoicePayment[];
  issuedAt: Date | null;
  sentAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  totals: InvoiceTotals;

  constructor(props: InvoiceProps) {
    this.id = props.id;
    this.tenantId = props.tenantId;
    this.customerId = props.customerId;
    this.currency = props.currency;
    this.notes = props.notes ?? null;
    this.terms = props.terms ?? null;
    this.number = props.number ?? null;
    this.status = props.status;
    this.lineItems = props.lineItems;
    this.payments = props.payments;
    this.issuedAt = props.issuedAt ?? null;
    this.sentAt = props.sentAt ?? null;
    this.createdAt = props.createdAt;
    this.updatedAt = props.updatedAt;
    this.totals = this.calculateTotals();
  }

  static createDraft(params: {
    id: string;
    tenantId: string;
    customerId: string;
    currency: string;
    notes?: string;
    terms?: string;
    lineItems: InvoiceLine[];
    createdAt: Date;
  }) {
    return new InvoiceAggregate({
      ...params,
      status: "DRAFT",
      number: null,
      payments: [],
      issuedAt: null,
      sentAt: null,
      updatedAt: params.createdAt,
    });
  }

  updateHeader(patch: Partial<Pick<InvoiceProps, "customerId" | "currency" | "notes" | "terms">>) {
    if (this.status !== "DRAFT") {
      // Allow updating notes/terms even after draft, but block other fields
      const allowed = ["notes", "terms"];
      const disallowedPatch = Object.keys(patch).some((k) => !allowed.includes(k));
      if (disallowedPatch) {
        throw new Error("Cannot update invoice header after finalize");
      }
    }

    if (patch.customerId !== undefined) this.customerId = patch.customerId;
    if (patch.currency !== undefined) this.currency = patch.currency;
    if (patch.notes !== undefined) this.notes = patch.notes;
    if (patch.terms !== undefined) this.terms = patch.terms;
    this.touch();
  }

  replaceLineItems(lineItems: InvoiceLine[]) {
    if (this.status !== "DRAFT") {
      throw new Error("Cannot change line items unless draft");
    }
    this.lineItems = lineItems;
    this.recalculateTotals();
    this.touch();
  }

  finalize(number: string, issuedAt: Date) {
    if (this.status !== "DRAFT") {
      throw new Error("Only draft invoices can be finalized");
    }
    if (!this.customerId) {
      throw new Error("Customer is required to finalize");
    }
    if (!this.lineItems.length) {
      throw new Error("At least one line item is required to finalize");
    }
    this.status = "ISSUED";
    this.number = number;
    this.issuedAt = issuedAt;
    this.touch();
  }

  markSent(sentAt: Date) {
    if (this.status !== "ISSUED" && this.status !== "SENT") {
      throw new Error("Only issued invoices can be sent");
    }
    this.status = "SENT";
    this.sentAt = sentAt;
    this.touch();
  }

  recordPayment(payment: InvoicePayment) {
    if (this.status === "CANCELED") {
      throw new Error("Cannot record payment on canceled invoice");
    }
    if (this.status === "DRAFT") {
      throw new Error("Cannot record payment on draft invoice");
    }
    this.payments.push(payment);
    this.recalculateTotals();
    if (this.totals.paidCents >= this.totals.totalCents) {
      this.status = "PAID";
    }
    this.touch();
  }

  cancel(reason?: string, canceledAt?: Date) {
    if (this.status === "PAID") {
      throw new Error("Cannot cancel a paid invoice");
    }
    if (this.status === "CANCELED") return;
    this.status = "CANCELED";
    this.notes = reason ?? this.notes ?? null;
    this.sentAt = canceledAt ?? this.sentAt;
    this.touch();
  }

  private calculateTotals(): InvoiceTotals {
    const subtotal = this.lineItems.reduce((sum, line) => sum + line.qty * line.unitPriceCents, 0);
    const taxCents = 0;
    const discountCents = 0;
    const totalCents = subtotal + taxCents - discountCents;
    const paidCents = this.payments.reduce((sum, p) => sum + p.amountCents, 0);
    const dueCents = Math.max(totalCents - paidCents, 0);
    return {
      subtotalCents: subtotal,
      taxCents,
      discountCents,
      totalCents,
      paidCents,
      dueCents,
    };
  }

  private recalculateTotals() {
    this.totals = this.calculateTotals();
  }

  private touch() {
    this.updatedAt = new Date();
  }
}
