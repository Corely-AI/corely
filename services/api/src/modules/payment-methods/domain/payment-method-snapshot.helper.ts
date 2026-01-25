import type { PaymentMethodSnapshot, PaymentMethod } from "@corely/contracts";

/**
 * Generates a payment method snapshot for an invoice
 * Called when issuing/sending an invoice to freeze payment instructions
 */
export function snapshotPaymentMethod(
  method: PaymentMethod,
  invoiceNumber: string | null | undefined
): PaymentMethodSnapshot {
  const referenceText = resolveReferenceTemplate(method.referenceTemplate, invoiceNumber);

  return {
    type: method.type,
    label: method.label,
    accountHolderName: method.type === "BANK_TRANSFER" ? undefined : undefined, // Will be populated below
    iban: method.type === "BANK_TRANSFER" ? undefined : undefined,
    bic: method.type === "BANK_TRANSFER" ? undefined : undefined,
    bankName: method.type === "BANK_TRANSFER" ? undefined : undefined,
    currency: method.type === "BANK_TRANSFER" ? "EUR" : undefined, // Will be populated below
    instructions: method.instructions || undefined,
    payUrl: method.payUrl || undefined,
    referenceText,
    snapshotVersion: 1,
    snapshotedAt: new Date(),
  };
}

/**
 * Resolves template variables in reference template
 * Supports: {invoiceNumber} -> the invoice number
 */
export function resolveReferenceTemplate(
  template: string,
  invoiceNumber: string | null | undefined
): string {
  return template.replace(/{invoiceNumber}/g, invoiceNumber || "DRAFT");
}

/**
 * Enriches snapshot with bank account details (called after loading account)
 */
export function enrichSnapshotWithBankAccount(
  snapshot: PaymentMethodSnapshot,
  bankAccount: {
    accountHolderName: string;
    iban: string;
    bic?: string | null;
    bankName?: string | null;
    currency: string;
  }
): PaymentMethodSnapshot {
  return {
    ...snapshot,
    accountHolderName: bankAccount.accountHolderName,
    iban: bankAccount.iban,
    bic: bankAccount.bic || undefined,
    bankName: bankAccount.bankName || undefined,
    currency: bankAccount.currency,
  };
}
