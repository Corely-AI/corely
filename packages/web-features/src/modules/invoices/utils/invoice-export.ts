import type { InvoiceDto } from "@corely/contracts";

const CSV_MIME_TYPE = "text/csv;charset=utf-8;";

function formatDateTime(value: string | null | undefined, locale?: string): string {
  if (!value) {
    return "";
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  return date.toLocaleString(locale);
}

function formatMoney(cents: number): string {
  return (cents / 100).toFixed(2);
}

function escapeCsvCell(value: string | number | null | undefined): string {
  const normalized = value == null ? "" : String(value);
  if (!/[",\n]/.test(normalized)) {
    return normalized;
  }
  return `"${normalized.replace(/"/g, '""')}"`;
}

function row(...cells: Array<string | number | null | undefined>): string {
  return cells.map((cell) => escapeCsvCell(cell)).join(",");
}

export function buildInvoiceExportCsv(invoice: InvoiceDto, locale?: string): string {
  const rows: string[] = [];
  const invoiceLabel = invoice.number ?? invoice.id;
  const currency = invoice.currency;

  rows.push(row("Section", "Field", "Value"));
  rows.push(row("Invoice", "ID", invoice.id));
  rows.push(row("Invoice", "Number", invoice.number));
  rows.push(row("Invoice", "Status", invoice.status));
  rows.push(row("Invoice", "Currency", currency));
  rows.push(row("Invoice", "Invoice date", invoice.invoiceDate));
  rows.push(row("Invoice", "Due date", invoice.dueDate));
  rows.push(row("Invoice", "Issued at", formatDateTime(invoice.issuedAt, locale)));
  rows.push(row("Invoice", "Sent at", formatDateTime(invoice.sentAt, locale)));
  rows.push(row("Invoice", "Created at", formatDateTime(invoice.createdAt, locale)));
  rows.push(row("Invoice", "Updated at", formatDateTime(invoice.updatedAt, locale)));
  rows.push(row("Customer", "Name", invoice.billToName));
  rows.push(row("Customer", "Email", invoice.billToEmail));
  rows.push(row("Customer", "VAT ID", invoice.billToVatId));
  rows.push(row("Customer", "Address line 1", invoice.billToAddressLine1));
  rows.push(row("Customer", "Address line 2", invoice.billToAddressLine2));
  rows.push(row("Customer", "Postal code", invoice.billToPostalCode));
  rows.push(row("Customer", "City", invoice.billToCity));
  rows.push(row("Customer", "Country", invoice.billToCountry));
  rows.push(row("Invoice", "Notes", invoice.notes));
  rows.push(row("Invoice", "Terms", invoice.terms));
  rows.push("");

  rows.push(
    row("Line Items", "Description", "Qty", `Unit price (${currency})`, `Line total (${currency})`)
  );
  invoice.lineItems.forEach((line) => {
    const lineTotal = Math.round(line.qty * line.unitPriceCents);
    rows.push(
      row(
        "Line Item",
        line.description,
        line.qty,
        formatMoney(line.unitPriceCents),
        formatMoney(lineTotal)
      )
    );
  });
  rows.push("");

  rows.push(row("Totals", "Field", `Amount (${currency})`));
  rows.push(row("Total", "Subtotal", formatMoney(invoice.totals.subtotalCents)));
  rows.push(row("Total", "Tax", formatMoney(invoice.totals.taxCents)));
  rows.push(row("Total", "Discount", formatMoney(invoice.totals.discountCents)));
  rows.push(row("Total", "Total", formatMoney(invoice.totals.totalCents)));
  rows.push(row("Total", "Paid", formatMoney(invoice.totals.paidCents)));
  rows.push(row("Total", "Due", formatMoney(invoice.totals.dueCents)));
  rows.push("");

  rows.push(row("Payments", "Paid at", `Amount (${currency})`, "Note"));
  (invoice.payments ?? []).forEach((payment) => {
    rows.push(
      row(
        "Payment",
        formatDateTime(payment.paidAt, locale),
        formatMoney(payment.amountCents),
        payment.note
      )
    );
  });

  if ((invoice.payments ?? []).length === 0) {
    rows.push(row("Payment", "", "", ""));
  }

  rows.push("");
  rows.push(row("Generated", "Invoice reference", invoiceLabel));
  rows.push(row("Generated", "Exported at", formatDateTime(new Date().toISOString(), locale)));

  return rows.join("\n");
}

export function downloadInvoiceExportCsv(invoice: InvoiceDto, locale?: string): void {
  if (typeof window === "undefined" || typeof document === "undefined") {
    return;
  }

  const csv = buildInvoiceExportCsv(invoice, locale);
  const blob = new Blob([csv], { type: CSV_MIME_TYPE });
  const url = window.URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  const rawId = invoice.number ?? invoice.id;
  const sanitizedId = rawId.replace(/[^a-zA-Z0-9_-]+/g, "-").replace(/^-+|-+$/g, "");
  anchor.href = url;
  anchor.download = `invoice-${sanitizedId || invoice.id}.csv`;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  window.URL.revokeObjectURL(url);
}
