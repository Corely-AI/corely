export const SIGN_DOCUMENT_PREFIX = "sign-private-";
export const EXPENSE_RECEIPT_DOCUMENT_PREFIX = "expense-receipt-private-";
export const VENDOR_BILL_DOCUMENT_PREFIX = "vendor-bill-private-";

export const TASK_CONTEXT_DOCUMENT_PREFIX = "task-context-private-";

export const isRestrictedDocumentId = (id: string) =>
  id.startsWith(SIGN_DOCUMENT_PREFIX) ||
  id.startsWith(TASK_CONTEXT_DOCUMENT_PREFIX) ||
  id.startsWith(VENDOR_BILL_DOCUMENT_PREFIX) ||
  id.startsWith(EXPENSE_RECEIPT_DOCUMENT_PREFIX);
