export const SIGN_DOCUMENT_PREFIX = "sign-private-";
export const VENDOR_BILL_DOCUMENT_PREFIX = "vendor-bill-private-";

export const isRestrictedDocumentId = (id: string) =>
  id.startsWith(SIGN_DOCUMENT_PREFIX) || id.startsWith(VENDOR_BILL_DOCUMENT_PREFIX);
