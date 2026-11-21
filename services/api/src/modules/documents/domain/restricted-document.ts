import { isRestrictedDocumentId as isSigningDocumentId } from "@corely/domain";
import { isPersonnelDocumentId } from "./personnel-document";

export { SIGN_DOCUMENT_PREFIX } from "@corely/domain";
export const isRestrictedDocumentId = (id: string) =>
  isSigningDocumentId(id) || isPersonnelDocumentId(id);
