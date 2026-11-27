export const SIGN_DOCUMENT_PREFIX = "sign-private-";
export const EXPENSE_RECEIPT_DOCUMENT_PREFIX = "expense-receipt-private-";
export const VENDOR_BILL_DOCUMENT_PREFIX = "vendor-bill-private-";
export const KNOWLEDGE_DOCUMENT_PREFIX = "knowledge-private-";

export const isRestrictedDocumentId = (id: string) =>
  id.startsWith(SIGN_DOCUMENT_PREFIX) ||
  id.startsWith(VENDOR_BILL_DOCUMENT_PREFIX) ||
  id.startsWith(EXPENSE_RECEIPT_DOCUMENT_PREFIX) ||
  id.startsWith(KNOWLEDGE_DOCUMENT_PREFIX);
