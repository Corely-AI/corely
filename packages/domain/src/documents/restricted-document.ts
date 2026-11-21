export const SIGN_DOCUMENT_PREFIX = "sign-private-";
export const isRestrictedDocumentId = (id: string) => id.startsWith(SIGN_DOCUMENT_PREFIX);
