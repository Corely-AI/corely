// Reserved forever: generic document/file APIs cannot declassify personnel records.
export const PERSONNEL_DOCUMENT_PREFIX = "personnel-";
export const isPersonnelDocumentId = (id: string) => id.startsWith(PERSONNEL_DOCUMENT_PREFIX);
