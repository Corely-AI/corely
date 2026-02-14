import type { InvoiceEmailProps } from "@corely/email-templates/invoices";

type BillToFields = {
  billToName?: string | null;
  billToEmail?: string | null;
  billToVatId?: string | null;
  billToAddressLine1?: string | null;
  billToAddressLine2?: string | null;
  billToCity?: string | null;
  billToPostalCode?: string | null;
  billToCountry?: string | null;
};

type InvoiceLineLike = {
  description: string;
  qty: number;
  unitPriceCents: number;
};

type PaymentDetailsLike = {
  type?: string | null;
  label?: string | null;
  accountHolderName?: string | null;
  iban?: string | null;
  bic?: string | null;
  bankName?: string | null;
  referenceText?: string | null;
  instructions?: string | null;
};

type InvoiceLike = BillToFields & {
  number?: string | null;
  currency: string;
  dueDate?: Date | null;
  lines: InvoiceLineLike[];
  paymentSnapshot?: unknown;
  paymentDetails?: unknown;
};

type MapperInput = {
  invoice: InvoiceLike;
  companyName: string;
  customMessage?: string | undefined;
  viewInvoiceUrl?: string | undefined;
  locale?: string | undefined;
};

export function mapToInvoiceEmailProps(input: MapperInput): InvoiceEmailProps {
  const { invoice, companyName, customMessage, viewInvoiceUrl, locale } = input;

  // Calculate total amount
  const totalAmountCents = invoice.lines.reduce(
    (sum: number, line: InvoiceLineLike) => sum + line.qty * line.unitPriceCents,
    0
  );

  // Format currency amounts
  const formatAmount = (amountCents: number): string => {
    const amount = amountCents / 100;
    return new Intl.NumberFormat(locale ?? "en-US", {
      style: "currency",
      currency: invoice.currency.toUpperCase(),
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  };

  // Format date
  const formatDate = (date: Date): string => {
    return new Intl.DateTimeFormat(locale ?? "en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    }).format(date);
  };

  const paymentSnapshot =
    toPaymentDetails(invoice.paymentSnapshot) ?? toPaymentDetails(invoice.paymentDetails);

  return {
    invoiceNumber: invoice.number ?? "DRAFT",
    companyName,
    dueDate: invoice.dueDate ? formatDate(invoice.dueDate) : "Upon receipt",
    totalAmount: formatAmount(totalAmountCents),
    currency: invoice.currency.toUpperCase(),
    customerName: invoice.billToName ?? "Customer",
    customMessage,
    lines: invoice.lines.map((line: InvoiceLineLike) => ({
      description: line.description,
      quantity: line.qty,
      unitPrice: formatAmount(line.unitPriceCents),
      amount: formatAmount(line.qty * line.unitPriceCents),
    })),
    paymentDetails: paymentSnapshot
      ? {
          method: paymentSnapshot.label ?? paymentSnapshot.type ?? undefined,
          accountHolderName: paymentSnapshot.accountHolderName ?? undefined,
          iban: paymentSnapshot.iban ?? undefined,
          bic: paymentSnapshot.bic ?? undefined,
          bankName: paymentSnapshot.bankName ?? undefined,
          referenceText: paymentSnapshot.referenceText ?? undefined,
          instructions: paymentSnapshot.instructions ?? undefined,
        }
      : undefined,
    viewInvoiceUrl,
    locale,
  };
}

function toPaymentDetails(value: unknown): PaymentDetailsLike | undefined {
  if (!value || typeof value !== "object") {
    return undefined;
  }

  const record = value as Record<string, unknown>;

  const accountHolderName =
    typeof record.accountHolderName === "string" ? record.accountHolderName : undefined;
  const iban = typeof record.iban === "string" ? record.iban : undefined;
  const bic = typeof record.bic === "string" ? record.bic : undefined;
  const bankName = typeof record.bankName === "string" ? record.bankName : undefined;
  const referenceText = typeof record.referenceText === "string" ? record.referenceText : undefined;
  const instructions = typeof record.instructions === "string" ? record.instructions : undefined;
  const label = typeof record.label === "string" ? record.label : undefined;
  const type = typeof record.type === "string" ? record.type : undefined;

  if (
    !accountHolderName &&
    !iban &&
    !bic &&
    !bankName &&
    !referenceText &&
    !instructions &&
    !label
  ) {
    return undefined;
  }

  return {
    type,
    label,
    accountHolderName,
    iban,
    bic,
    bankName,
    referenceText,
    instructions,
  };
}
