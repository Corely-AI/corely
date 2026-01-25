import type {
  QuoteDto,
  SalesInvoiceDto,
  SalesOrderDto,
  SalesPaymentDto,
  SalesSettingsDto,
  InvoiceDto,
} from "@corely/contracts";
import { type QuoteAggregate } from "../../domain/quote.aggregate";
import { type SalesOrderAggregate } from "../../domain/order.aggregate";
import { type SalesSettingsAggregate } from "../../domain/settings.aggregate";

/**
 * Maps a unified InvoiceDto from the Invoices module to the legacy SalesInvoiceDto format.
 * This ensures backward compatibility while the Invoices module becomes the SSoT.
 */
export const mapUnifiedInvoiceToSalesInvoice = (invoice: InvoiceDto): SalesInvoiceDto => ({
  id: invoice.id,
  tenantId: invoice.tenantId,
  number: invoice.number,
  status: (invoice.status === "CANCELED" ? "VOID" : invoice.status) as any, // Map CANCELED -> VOID
  customerPartyId: invoice.customerPartyId,
  customerContactPartyId: null, // Unified doesn't have this yet or maps differently
  issueDate: invoice.invoiceDate,
  dueDate: invoice.dueDate,
  currency: invoice.currency,
  paymentTerms: invoice.terms,
  notes: invoice.notes,
  lineItems: invoice.lineItems.map((item) => ({
    id: item.id,
    description: item.description,
    quantity: item.qty,
    unitPriceCents: item.unitPriceCents,
    discountCents: 0,
    sortOrder: 0,
  })),
  totals: {
    subtotalCents: invoice.totals.subtotalCents,
    discountCents: invoice.totals.discountCents,
    taxCents: invoice.totals.taxCents,
    totalCents: invoice.totals.totalCents,
    paidCents: invoice.totals.paidCents,
    dueCents: invoice.totals.dueCents,
  },
  createdAt: invoice.createdAt,
  updatedAt: invoice.updatedAt,
  issuedAt: invoice.issuedAt,
  voidedAt: invoice.status === "CANCELED" ? invoice.updatedAt : null,
  voidReason: undefined,
  sourceSalesOrderId: invoice.sourceType === "order" ? invoice.sourceId : null,
  sourceQuoteId: invoice.sourceType === "quote" ? invoice.sourceId : null,
});

const toIso = (value: Date | null | undefined): string | null | undefined =>
  value ? value.toISOString() : value === null ? null : undefined;

export const toQuoteDto = (quote: QuoteAggregate): QuoteDto => ({
  id: quote.id,
  tenantId: quote.tenantId,
  number: quote.number,
  status: quote.status,
  customerPartyId: quote.customerPartyId,
  customerContactPartyId: quote.customerContactPartyId ?? undefined,
  issueDate: quote.issueDate ?? undefined,
  validUntilDate: quote.validUntilDate ?? undefined,
  currency: quote.currency,
  paymentTerms: quote.paymentTerms ?? undefined,
  notes: quote.notes ?? undefined,
  lineItems: quote.lineItems.map((item) => ({
    id: item.id,
    description: item.description,
    quantity: item.quantity,
    unitPriceCents: item.unitPriceCents,
    discountCents: item.discountCents ?? undefined,
    taxCode: item.taxCode ?? undefined,
    revenueCategory: item.revenueCategory ?? undefined,
    sortOrder: item.sortOrder ?? undefined,
  })),
  totals: quote.totals,
  sentAt: toIso(quote.sentAt) ?? undefined,
  acceptedAt: toIso(quote.acceptedAt) ?? undefined,
  rejectedAt: toIso(quote.rejectedAt) ?? undefined,
  createdAt: toIso(quote.createdAt) ?? "",
  updatedAt: toIso(quote.updatedAt) ?? "",
  convertedToSalesOrderId: quote.convertedToSalesOrderId ?? undefined,
  convertedToInvoiceId: quote.convertedToInvoiceId ?? undefined,
});

export const toOrderDto = (order: SalesOrderAggregate): SalesOrderDto => ({
  id: order.id,
  tenantId: order.tenantId,
  number: order.number,
  status: order.status,
  customerPartyId: order.customerPartyId,
  customerContactPartyId: order.customerContactPartyId ?? undefined,
  orderDate: order.orderDate ?? undefined,
  deliveryDate: order.deliveryDate ?? undefined,
  currency: order.currency,
  notes: order.notes ?? undefined,
  lineItems: order.lineItems.map((item) => ({
    id: item.id,
    description: item.description,
    quantity: item.quantity,
    unitPriceCents: item.unitPriceCents,
    discountCents: item.discountCents ?? undefined,
    taxCode: item.taxCode ?? undefined,
    revenueCategory: item.revenueCategory ?? undefined,
    sortOrder: item.sortOrder ?? undefined,
  })),
  totals: order.totals,
  confirmedAt: toIso(order.confirmedAt) ?? undefined,
  fulfilledAt: toIso(order.fulfilledAt) ?? undefined,
  canceledAt: toIso(order.canceledAt) ?? undefined,
  createdAt: toIso(order.createdAt) ?? "",
  updatedAt: toIso(order.updatedAt) ?? "",
  sourceQuoteId: order.sourceQuoteId ?? undefined,
  sourceInvoiceId: order.sourceInvoiceId ?? undefined,
});

export const toSettingsDto = (settings: SalesSettingsAggregate): SalesSettingsDto => ({
  id: settings.id,
  tenantId: settings.tenantId,
  defaultPaymentTerms: settings.defaultPaymentTerms ?? undefined,
  defaultCurrency: settings.defaultCurrency,
  quoteNumberPrefix: settings.quoteNumberPrefix,
  quoteNextNumber: settings.quoteNextNumber,
  orderNumberPrefix: settings.orderNumberPrefix,
  orderNextNumber: settings.orderNextNumber,
  invoiceNumberPrefix: settings.invoiceNumberPrefix,
  invoiceNextNumber: settings.invoiceNextNumber,
  defaultRevenueAccountId: settings.defaultRevenueAccountId ?? undefined,
  defaultAccountsReceivableAccountId: settings.defaultAccountsReceivableAccountId ?? undefined,
  defaultBankAccountId: settings.defaultBankAccountId ?? undefined,
  autoPostOnIssue: settings.autoPostOnIssue,
  autoPostOnPayment: settings.autoPostOnPayment,
  createdAt: toIso(settings.createdAt) ?? "",
  updatedAt: toIso(settings.updatedAt) ?? "",
});
