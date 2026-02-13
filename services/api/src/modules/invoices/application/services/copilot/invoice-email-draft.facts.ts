import type {
  InvoiceEmailDraftLanguage,
  InvoiceIssueEmailDraftTone,
  InvoiceReminderEmailDraftTone,
} from "@corely/contracts";
import type { InvoiceAggregate } from "../../../domain/invoice.aggregate";

type IssueTone = InvoiceIssueEmailDraftTone;
type ReminderTone = InvoiceReminderEmailDraftTone;

type PaymentDetailsRecord = {
  accountHolderName?: string | null;
  bankName?: string | null;
  iban?: string | null;
  bic?: string | null;
  referenceTemplate?: string | null;
  referenceText?: string | null;
};

export type InvoiceEmailDraftFacts = {
  invoiceNumber: string | null;
  invoiceStatus: string;
  customerName: string | null;
  dueDate: string | null;
  currency: string;
  amountDueCents: number;
  amountDueDisplay: string;
  bankDetails: {
    accountHolderName: string | null;
    bankName: string | null;
    iban: string | null;
    bic: string | null;
    paymentReference: string | null;
  };
  hasBankDetails: boolean;
  brandName: string | null;
};

const toLocale = (language: InvoiceEmailDraftLanguage): string => {
  switch (language) {
    case "de":
      return "de-DE";
    case "vi":
      return "vi-VN";
    default:
      return "en-US";
  }
};

const trimOrNull = (value: string | null | undefined): string | null => {
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
};

const resolvePaymentReference = (
  paymentDetails: PaymentDetailsRecord,
  invoiceNumber: string | null
): string | null => {
  const explicit = trimOrNull(paymentDetails.referenceText);
  if (explicit) {
    return explicit;
  }

  const template = trimOrNull(paymentDetails.referenceTemplate);
  if (!template) {
    return trimOrNull(invoiceNumber);
  }

  return (
    template.replace(/{invoiceNumber}/g, invoiceNumber ?? "").trim() || trimOrNull(invoiceNumber)
  );
};

const readIssuerName = (invoice: InvoiceAggregate): string | null => {
  const raw = invoice.issuerSnapshot;
  if (!raw || typeof raw !== "object") {
    return null;
  }

  const maybeName = (raw as { name?: unknown }).name;
  return typeof maybeName === "string" && maybeName.trim().length > 0 ? maybeName.trim() : null;
};

export const buildInvoiceEmailDraftFacts = (
  invoice: InvoiceAggregate,
  language: InvoiceEmailDraftLanguage
): InvoiceEmailDraftFacts => {
  const invoiceNumber = trimOrNull(invoice.number);
  const dueDate = trimOrNull(invoice.dueDate ?? null);

  const source =
    (invoice.paymentDetails as PaymentDetailsRecord | null | undefined) ??
    (invoice.paymentSnapshot as PaymentDetailsRecord | null | undefined) ??
    {};

  const bankDetails = {
    accountHolderName: trimOrNull(source.accountHolderName),
    bankName: trimOrNull(source.bankName),
    iban: trimOrNull(source.iban),
    bic: trimOrNull(source.bic),
    paymentReference: resolvePaymentReference(source, invoiceNumber),
  };

  const hasBankDetails = Boolean(
    bankDetails.accountHolderName || bankDetails.bankName || bankDetails.iban || bankDetails.bic
  );

  return {
    invoiceNumber,
    invoiceStatus: invoice.status,
    customerName: trimOrNull(invoice.billToName),
    dueDate,
    currency: invoice.currency,
    amountDueCents: invoice.totals.dueCents,
    amountDueDisplay: new Intl.NumberFormat(toLocale(language), {
      style: "currency",
      currency: invoice.currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(invoice.totals.dueCents / 100),
    bankDetails,
    hasBankDetails,
    brandName: readIssuerName(invoice),
  };
};

export const fallbackIssueSubject = (args: {
  language: InvoiceEmailDraftLanguage;
  invoiceNumber: string | null;
}): string => {
  const suffix = args.invoiceNumber ? ` ${args.invoiceNumber}` : "";
  switch (args.language) {
    case "de":
      return `Rechnung${suffix}`;
    case "vi":
      return `Hoa don${suffix}`;
    default:
      return `Invoice${suffix}`;
  }
};

export const fallbackReminderSubject = (args: {
  language: InvoiceEmailDraftLanguage;
  invoiceNumber: string | null;
}): string => {
  const suffix = args.invoiceNumber ? ` ${args.invoiceNumber}` : "";
  switch (args.language) {
    case "de":
      return `Zahlungserinnerung${suffix}`;
    case "vi":
      return `Nhac thanh toan${suffix}`;
    default:
      return `Payment reminder${suffix}`;
  }
};

export const fallbackIssueBody = (args: {
  language: InvoiceEmailDraftLanguage;
  customerName: string | null;
  invoiceNumber: string | null;
  amountDueDisplay: string;
}): string => {
  const customer = args.customerName ?? "there";
  const invoiceLabel = args.invoiceNumber ?? "your invoice";

  switch (args.language) {
    case "de":
      return `Hallo ${customer},\n\nIhre Rechnung ${invoiceLabel} wurde erstellt. Der offene Betrag ist ${args.amountDueDisplay}.`;
    case "vi":
      return `Xin chao ${customer},\n\nHoa don ${invoiceLabel} da duoc phat hanh. So tien can thanh toan la ${args.amountDueDisplay}.`;
    default:
      return `Hi ${customer},\n\nYour invoice ${invoiceLabel} has been issued. The amount due is ${args.amountDueDisplay}.`;
  }
};

export const fallbackReminderBody = (args: {
  language: InvoiceEmailDraftLanguage;
  tone: ReminderTone;
  customerName: string | null;
  invoiceNumber: string | null;
  amountDueDisplay: string;
  dueDate: string | null;
}): string => {
  const customer = args.customerName ?? "there";
  const invoiceLabel = args.invoiceNumber ?? "your invoice";
  const dueText = args.dueDate ? ` (due ${args.dueDate})` : "";

  if (args.language === "de") {
    return `Hallo ${customer},\n\nDies ist eine ${args.tone === "firm" ? "dringende " : ""}Erinnerung zu Rechnung ${invoiceLabel}${dueText}. Offener Betrag: ${args.amountDueDisplay}.`;
  }

  if (args.language === "vi") {
    return `Xin chao ${customer},\n\nDay la nhac thanh toan${args.tone === "firm" ? " khan" : ""} cho hoa don ${invoiceLabel}${dueText}. So tien con no: ${args.amountDueDisplay}.`;
  }

  return `Hi ${customer},\n\nThis is a${args.tone === "firm" ? " firm" : ""} reminder for ${invoiceLabel}${dueText}. Outstanding amount: ${args.amountDueDisplay}.`;
};

export const ensureToneDefault = <T extends IssueTone | ReminderTone>(
  tone: T | undefined,
  fallbackTone: T
): T => {
  return tone ?? fallbackTone;
};
